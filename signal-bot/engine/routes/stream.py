"""SSE endpoint streaming live signal events to browsers (EventSource).

One-way server->client push (realtime-live-backend §1 picks SSE, not WebSocket,
for a one-directional feed). The browser's native EventSource auto-reconnects and
echoes the last received event id as the `Last-Event-ID` header, which we use to
resume from the replay buffer.

Per-connection flow:
  1. Read Last-Event-ID (header, or the `?lastEventId=` query fallback).
  2. Replay buffered events with seq > last_id (or a resync sentinel if the
     client fell behind the buffer) via event_bus.replay_since.
  3. Stream live events from a fresh Redis subscription.
  4. Emit a heartbeat comment every ~15s so proxies don't reap the idle
     connection and the client can detect a dead link (realtime-live-backend §3).
  5. Each data event's SSE `id` is its `seq`, so the browser sends it back as
     Last-Event-ID on reconnect.

Degradation: if Redis is down, subscribe() yields a one-time "degraded" event and
ends; we forward it and let the generator finish so the endpoint never 500s. The
client's EventSource will then auto-reconnect (and re-degrade) on its own retry.
"""
import asyncio
import json
import logging
import time
from collections import defaultdict, deque
from typing import AsyncGenerator, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sse_starlette.sse import EventSourceResponse

from core.event_bus import get_event_bus, EventBus

logger = logging.getLogger(__name__)

router = APIRouter()

# web-security: limit how many SSE connections a single IP can open per minute.
_STREAM_RATE_MAX = 20
_STREAM_RATE_WINDOW = 60.0
_stream_hits: dict[str, deque] = defaultdict(deque)
_stream_lock = asyncio.Lock()


async def _rate_limit_stream(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    async with _stream_lock:
        hits = _stream_hits[client_ip]
        cutoff = now - _STREAM_RATE_WINDOW
        while hits and hits[0] <= cutoff:
            hits.popleft()
        if len(hits) >= _STREAM_RATE_MAX:
            retry_after = int(_STREAM_RATE_WINDOW - (now - hits[0])) + 1
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded for SSE stream",
                headers={"Retry-After": str(max(retry_after, 1))},
            )
        hits.append(now)

HEARTBEAT_SECONDS = 15.0


def _parse_last_event_id(request: Request) -> int:
    """Return the client's Last-Event-ID as an int, or 0 if absent/invalid.

    Browsers send it as the `Last-Event-ID` request header on reconnect. We also
    accept a `?lastEventId=` query param so the stream can be resumed by a
    non-EventSource client (curl, tests) that can't set the header.
    """
    raw = request.headers.get("last-event-id")
    if raw is None:
        raw = request.query_params.get("lastEventId")
    if raw is None:
        return 0
    try:
        return int(raw)
    except (ValueError, TypeError):
        return 0


def _sse_event(envelope: dict) -> dict:
    """Map an envelope to sse-starlette's event dict.

    The data event carries the JSON envelope as `data`, the event name as
    `event` (the namespaced verb), and — for data-bearing events that have a
    seq — `id` set to the seq so the browser stores it as Last-Event-ID.
    """
    out: dict = {
        "event": envelope.get("type", "message"),
        "data": json.dumps(envelope, separators=(",", ":"), default=str),
    }
    seq = envelope.get("seq")
    if isinstance(seq, int):
        out["id"] = str(seq)
    return out


async def signal_event_generator(
    request: Request,
    bus: EventBus,
    last_id: int,
    heartbeat: float = HEARTBEAT_SECONDS,
) -> AsyncGenerator[dict, None]:
    """The SSE event stream: replay -> live, with periodic heartbeats.

    Kept as a free function (not a closure) so tests can drive it directly with a
    fake bus and assert "replays a buffered event, then emits a heartbeat" without
    spinning up a live server.
    """
    # 1) Replay buffered events the client missed (resync sentinel if it fell
    #    behind the buffer). Never raises — replay_since degrades to [].
    try:
        for env in await bus.replay_since(last_id):
            yield _sse_event(env)
    except Exception as e:  # noqa: BLE001 - replay must not kill the stream
        logger.warning("stream: replay failed (continuing live): %s", e)

    # 2) Live stream with heartbeat. We pull from the subscription generator with
    #    a timeout; on timeout we emit a comment ping (sse-starlette renders a
    #    dict with only `comment` as an SSE `:comment` line) and keep waiting.
    live = bus.subscribe().__aiter__()
    try:
        while True:
            if await request.is_disconnected():
                break
            try:
                env = await asyncio.wait_for(live.__anext__(), timeout=heartbeat)
            except asyncio.TimeoutError:
                # Idle window elapsed -> heartbeat so proxies keep the connection
                # and the client notices a dead link.
                yield {"comment": "ping"}
                continue
            except StopAsyncIteration:
                # subscribe() ended (e.g. Redis degraded after a one-time
                # "degraded" event, or the broker closed). Stop cleanly.
                break
            yield _sse_event(env)
    except asyncio.CancelledError:
        raise
    finally:
        # Best-effort: close the underlying subscription generator so the Redis
        # pubsub is unsubscribed/closed when the client goes away.
        aclose = getattr(live, "aclose", None)
        if aclose is not None:
            try:
                await aclose()
            except Exception:  # noqa: BLE001
                pass


@router.get("/signals", dependencies=[Depends(_rate_limit_stream)])
async def stream_signals(request: Request) -> EventSourceResponse:
    """GET /api/stream/signals — Server-Sent Events stream of signal events.

    Resumes from Last-Event-ID, then streams live, with ~15s heartbeats. Never
    500s on a Redis outage: the generator yields a one-time degraded event and
    ends, and EventSource reconnects on its own.
    """
    bus = get_event_bus()
    last_id = _parse_last_event_id(request)
    generator = signal_event_generator(request, bus, last_id)
    # ping=15 also makes sse-starlette emit its own keep-alive comment as a
    # backstop; our generator additionally heartbeats on idle.
    return EventSourceResponse(generator, ping=int(HEARTBEAT_SECONDS))
