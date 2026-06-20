"""Real-time signal delivery backplane — Redis pub/sub + capped replay buffer.

WHY this module exists
======================
The engine runs as N FastAPI workers behind a load balancer. A new signal is
produced inside ONE worker's scan, but every connected SSE client (spread across
all workers) must receive it. A single-process in-memory broadcast only reaches
the clients connected to the worker that produced the signal. So we fan out
through Redis Pub/Sub: the producing worker PUBLISHes to a channel, and every
worker's subscriber receives it and pushes it to its own connected clients
(realtime-live-backend §4).

DESIGN CONTRACTS (must stay stable — the Phase-5 frontend EventSource depends on
them):

  Envelope (fixed up front, realtime-live-backend §2):
    {"v":1, "type":"signal.created"|"signal.updated"|"scan.completed",
     "seq":<int>, "ts":<iso8601>, "data":{...}}
  - `type` is a namespaced verb.
  - `seq` is a server-assigned, monotonically increasing integer (Redis INCR).
    It is the resume cursor: the SSE layer sets each event's SSE `id:` to `seq`,
    so the browser echoes it back as `Last-Event-ID` on reconnect.

  Resume (realtime-live-backend §8):
  - We keep a capped replay buffer of the most recent N events in a Redis list
    (`signal:events`), trimmed with LTRIM on every publish.
  - On reconnect the SSE layer calls `replay_since(last_id)`:
      * returns buffered events with seq > last_id, OR
      * returns the RESYNC sentinel if last_id is older than the oldest buffered
        event (the client missed more than the buffer holds and must refetch).

  Graceful degradation (realtime-live-backend §9, and the task mandate):
  - If Redis is down, NOTHING in this module raises into the caller. `publish`
    becomes a logged no-op (a Redis outage must NEVER break a scan), `subscribe`
    yields a one-time "degraded" event then ends, and `replay_since` returns an
    empty replay. The engine keeps serving REST with realtime simply degraded.

Seq atomicity across workers: `INCR` is atomic in Redis, so seq is globally
unique and monotonic across all workers sharing one Redis. The append+trim is
NOT atomic with the INCR (see self-review in the return contract): a crash
between INCR and RPUSH can leave a gap in seq, which the client tolerates
(it only ever compares "> last_id").
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from core.config import settings

logger = logging.getLogger(__name__)

# --- Redis keys / channel (stable names; do not rename without a migration) ---
CHANNEL = "signal:stream"        # PUBLISH/SUBSCRIBE fan-out channel
SEQ_KEY = "signal:seq"           # INCR counter -> monotonic seq
REPLAY_KEY = "signal:events"     # capped list of recent serialized envelopes
REPLAY_MAX = 100                 # how many recent events the replay buffer holds

ENVELOPE_VERSION = 1

# Sentinel returned by replay_since when the client's Last-Event-ID is older than
# the oldest buffered event (it missed more than the buffer can replay).
RESYNC = {"v": ENVELOPE_VERSION, "type": "resync"}


def _now_iso() -> str:
    """UTC ISO-8601 timestamp. Used only inside event payloads, NEVER in any
    cached prefix, so it does not affect prompt-cache stability elsewhere."""
    return datetime.now(timezone.utc).isoformat()


def _make_envelope(event_type: str, data: dict, seq: int) -> dict:
    return {
        "v": ENVELOPE_VERSION,
        "type": event_type,
        "seq": seq,
        "ts": _now_iso(),
        "data": data,
    }


class EventBus:
    """Async wrapper over redis.asyncio providing publish / subscribe / replay.

    All Redis calls are wrapped so a Redis outage degrades to a no-op instead of
    raising into the caller. `_redis` is None until connect() succeeds; if connect
    fails (Redis absent at boot) the bus stays in a permanently-degraded state and
    the engine still serves REST.
    """

    def __init__(self, redis_url: Optional[str] = None):
        self._redis_url = redis_url or settings.redis_url
        self._redis = None  # type: ignore[assignment]
        self._connected = False

    # ------------------------------------------------------------------ connect
    async def connect(self) -> None:
        """Create the Redis client and verify reachability with PING.

        Never raises: if Redis is unreachable we log and leave the bus degraded
        (the engine must still boot and serve REST without Redis).
        """
        if self._connected:
            return
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(
                self._redis_url, encoding="utf-8", decode_responses=True
            )
            await self._redis.ping()
            self._connected = True
            logger.info("EventBus connected to Redis at %s", self._redis_url)
        except Exception as e:  # noqa: BLE001 - degrade on ANY failure
            self._redis = None
            self._connected = False
            logger.warning("EventBus: Redis unavailable, realtime degraded: %s", e)

    @property
    def available(self) -> bool:
        return self._connected and self._redis is not None

    async def close(self) -> None:
        """Close the Redis client. Never raises (shutdown must not crash)."""
        if self._redis is not None:
            try:
                await self._redis.aclose()
            except Exception as e:  # noqa: BLE001
                logger.warning("EventBus: error closing Redis: %s", e)
        self._redis = None
        self._connected = False

    # ------------------------------------------------------------------ publish
    async def publish(self, event_type: str, data: dict) -> Optional[dict]:
        """Assign a monotonic seq, append to the capped replay buffer, and PUBLISH.

        Returns the published envelope (for tests / callers), or None when Redis
        is unavailable. NEVER raises — a Redis outage must not break the scan
        that called this (realtime-live-backend §9). On any failure we log and
        return None so the caller proceeds.
        """
        if not self.available:
            logger.debug("EventBus.publish no-op (Redis unavailable): %s", event_type)
            return None
        try:
            # Atomic, globally-unique, monotonic across all workers.
            seq = int(await self._redis.incr(SEQ_KEY))
            envelope = _make_envelope(event_type, data, seq)
            payload = json.dumps(envelope, separators=(",", ":"), default=str)

            # Append to the replay list and cap it. Pipelined so it is one
            # round-trip; LTRIM keeps only the most recent REPLAY_MAX entries.
            pipe = self._redis.pipeline(transaction=False)
            pipe.rpush(REPLAY_KEY, payload)
            pipe.ltrim(REPLAY_KEY, -REPLAY_MAX, -1)
            pipe.publish(CHANNEL, payload)
            await pipe.execute()
            return envelope
        except Exception as e:  # noqa: BLE001 - publish must never raise
            logger.warning("EventBus.publish failed (degraded, no-op): %s", e)
            return None

    async def publish_signal(self, signal, event_type: str) -> Optional[dict]:
        """Serialize a Signal into the envelope's `data` and publish it.

        `event_type` is "signal.created" or "signal.updated". Serialization reuses
        the REST serializer (routes.signals._serialize) so the SSE `data` payload
        is byte-for-byte the same shape the REST endpoints return — the frontend
        has one signal schema, not two. Never raises.
        """
        try:
            from routes.signals import _serialize

            data = _serialize(signal)
        except Exception as e:  # noqa: BLE001 - serialization must not crash scan
            logger.warning("EventBus.publish_signal serialize failed: %s", e)
            return None
        return await self.publish(event_type, data)

    # ---------------------------------------------------------------- subscribe
    async def subscribe(self) -> AsyncGenerator[dict, None]:
        """Async generator yielding live envelopes from the Redis channel.

        If Redis is unavailable, yields a single one-time "degraded" control
        event and ends, so the SSE layer can tell the client and close cleanly
        instead of 500-ing (realtime-live-backend §9). On a mid-stream Redis
        error we also emit "degraded" and stop.
        """
        if not self.available:
            yield {"v": ENVELOPE_VERSION, "type": "degraded",
                   "ts": _now_iso(), "data": {"reason": "redis_unavailable"}}
            return

        pubsub = self._redis.pubsub()
        try:
            await pubsub.subscribe(CHANNEL)
            async for message in pubsub.listen():
                if message is None or message.get("type") != "message":
                    continue
                raw = message.get("data")
                if raw is None:
                    continue
                try:
                    yield json.loads(raw)
                except (ValueError, TypeError):
                    logger.warning("EventBus.subscribe: dropped malformed payload")
        except asyncio.CancelledError:
            raise
        except Exception as e:  # noqa: BLE001
            logger.warning("EventBus.subscribe error (degraded): %s", e)
            yield {"v": ENVELOPE_VERSION, "type": "degraded",
                   "ts": _now_iso(), "data": {"reason": "subscribe_error"}}
        finally:
            try:
                await pubsub.unsubscribe(CHANNEL)
                await pubsub.aclose()
            except Exception:  # noqa: BLE001 - best-effort cleanup
                pass

    # ------------------------------------------------------------------- replay
    async def replay_since(self, last_id: int) -> list[dict]:
        """Return buffered events with seq > last_id, for SSE resume.

        Behavior (realtime-live-backend §8):
          * Empty list  -> nothing newer to replay (client is up to date, or the
            buffer is empty).
          * [RESYNC, ...]/[RESYNC] -> the client's last_id is OLDER than the
            oldest buffered event, so it missed more than the buffer holds; the
            SSE layer forwards the resync sentinel telling the client to refetch
            via REST. We put RESYNC first, then any events we *can* still replay.
          * [events...] -> the newer buffered events in seq order.

        Never raises; a Redis error degrades to an empty replay (live stream still
        attaches).
        """
        if not self.available:
            return []
        try:
            raw_items = await self._redis.lrange(REPLAY_KEY, 0, -1)
        except Exception as e:  # noqa: BLE001
            logger.warning("EventBus.replay_since failed (degraded, empty): %s", e)
            return []

        events: list[dict] = []
        for raw in raw_items:
            try:
                events.append(json.loads(raw))
            except (ValueError, TypeError):
                continue

        if not events:
            return []

        oldest_seq = events[0].get("seq", 0)
        newest_seq = events[-1].get("seq", 0)
        # If the client already has everything up to or past the newest, nothing
        # to do. If its cursor predates the oldest we still hold, it missed events
        # that have already aged out of the buffer -> tell it to resync.
        newer = [e for e in events if e.get("seq", 0) > last_id]

        # Seq-space RESET blind spot: if Redis was flushed/restarted, SEQ_KEY
        # restarts at 1, so a client reconnecting with a stale high Last-Event-ID
        # (from the OLD seq space) would have last_id > newest_seq. The plain
        # `> last_id` filter would silently return [] and the client would miss
        # every event in the new seq space. Detect this and force a resync so the
        # client refetches via REST instead of silently dropping signals.
        if last_id > 0 and last_id > newest_seq:
            return [RESYNC, *events]

        if last_id > 0 and last_id < oldest_seq - 1:
            # Gap: events between last_id and oldest_seq are gone. Resync, then
            # hand back whatever we can still replay so the client is as fresh as
            # possible after it refetches.
            return [RESYNC, *newer]

        return newer


# --------------------------------------------------------------------- singleton
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Module-level singleton accessor. One bus per process; all routes and the
    scan path share it so they publish/subscribe through the same Redis client."""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


async def publish_signal(signal, event_type: str) -> Optional[dict]:
    """Convenience helper used by the scan path: publish a Signal via the singleton
    bus. Never raises (wraps the bus call) so a Redis outage cannot break a scan."""
    try:
        return await get_event_bus().publish_signal(signal, event_type)
    except Exception as e:  # noqa: BLE001 - belt-and-suspenders for the scan path
        logger.warning("publish_signal helper failed (ignored): %s", e)
        return None
