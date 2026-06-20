"""EventBus + SSE stream tests — the realtime delivery contract.

These prove the invariants the Phase-5 frontend EventSource relies on:
  * publish assigns a strictly increasing seq (Redis INCR),
  * the replay buffer caps at REPLAY_MAX (LTRIM),
  * replay_since returns only newer events and the RESYNC sentinel when the
    client fell behind the buffer,
  * the envelope shape is exactly {v,type,seq,ts,data},
  * a Redis outage degrades publish to a logged no-op (NEVER raises) — the
    safety-critical guarantee that a Redis failure can't break a scan,
  * the SSE generator replays a buffered event, then heartbeats on idle.

Backed by fakeredis (in-memory, no network). If fakeredis is not importable the
whole module skips except the mock-based degradation test, which uses a raising
stub so the "publish must not raise when Redis errors" guarantee is still
covered without any redis dependency at all.
"""
import asyncio
import json

import pytest

from core import event_bus as eb
from core.event_bus import EventBus, RESYNC, REPLAY_MAX, ENVELOPE_VERSION

try:
    import fakeredis.aioredis as fakeredis_aio  # type: ignore
    HAS_FAKEREDIS = True
except Exception:  # noqa: BLE001
    HAS_FAKEREDIS = False

@pytest.fixture
async def bus():
    """An EventBus wired to a fresh in-memory fakeredis (no real network).

    Tests requesting this fixture SKIP if fakeredis is unavailable; the
    degradation and SSE-generator tests below take no `bus` fixture and so run
    regardless (they need no redis at all)."""
    if not HAS_FAKEREDIS:
        pytest.skip("fakeredis not installed; install requirements-dev.txt")
    b = EventBus(redis_url="redis://localhost:6379/0")
    b._redis = fakeredis_aio.FakeRedis(decode_responses=True)
    b._connected = True
    # clean slate
    await b._redis.flushall()
    yield b
    await b.close()


# --------------------------------------------------------------- seq monotonic
async def test_publish_assigns_increasing_seq(bus):
    e1 = await bus.publish("signal.created", {"ticker": "AAPL"})
    e2 = await bus.publish("signal.created", {"ticker": "MSFT"})
    e3 = await bus.publish("signal.updated", {"ticker": "AAPL"})
    assert e1["seq"] == 1
    assert e2["seq"] == 2
    assert e3["seq"] == 3
    assert e1["seq"] < e2["seq"] < e3["seq"]


# ------------------------------------------------------------------- envelope
async def test_envelope_shape(bus):
    env = await bus.publish("signal.created", {"ticker": "AAPL", "score": 88.0})
    assert set(env.keys()) == {"v", "type", "seq", "ts", "data"}
    assert env["v"] == ENVELOPE_VERSION
    assert env["type"] == "signal.created"
    assert isinstance(env["seq"], int)
    assert isinstance(env["ts"], str) and "T" in env["ts"]  # iso-8601
    assert env["data"] == {"ticker": "AAPL", "score": 88.0}


async def test_publish_signal_uses_rest_serializer(bus):
    """publish_signal serializes a Signal via routes.signals._serialize so the SSE
    data payload matches the REST schema."""
    from models.signal import Signal, Direction, Market, SignalStatus
    from datetime import datetime

    sig = Signal(
        ticker="NVDA", market=Market.US, sector="Tech", direction=Direction.LONG,
        score=91.0, strategy_hits={"strategies": ["x"]}, entry_price=100.0,
        stop_loss=95.0, tp1=105.0, tp2=110.0, tp3=115.0, risk_reward=2.0,
        regime="BULL", ceiling_score=70.0, indicators={}, timeframe="1D",
        status=SignalStatus.ACTIVE, created_at=datetime(2020, 1, 1),
    )
    env = await bus.publish_signal(sig, "signal.created")
    assert env["type"] == "signal.created"
    assert env["data"]["ticker"] == "NVDA"
    assert env["data"]["score"] == 91.0
    assert env["data"]["created_at"] == "2020-01-01T00:00:00"


# ----------------------------------------------------------------- replay cap
async def test_replay_buffer_caps_at_max(bus):
    total = REPLAY_MAX + 25
    for i in range(total):
        await bus.publish("signal.created", {"i": i})
    raw = await bus._redis.lrange(eb.REPLAY_KEY, 0, -1)
    assert len(raw) == REPLAY_MAX
    # the buffer holds the MOST RECENT REPLAY_MAX; oldest retained seq is the cap boundary
    first = json.loads(raw[0])
    last = json.loads(raw[-1])
    assert last["seq"] == total            # newest is the final publish
    assert first["seq"] == total - REPLAY_MAX + 1  # oldest still buffered


# --------------------------------------------------------------- replay_since
async def test_replay_since_returns_only_newer(bus):
    for i in range(5):
        await bus.publish("signal.created", {"i": i})  # seq 1..5
    newer = await bus.replay_since(3)
    seqs = [e["seq"] for e in newer]
    assert seqs == [4, 5]


async def test_replay_since_zero_returns_all_buffered(bus):
    for i in range(3):
        await bus.publish("signal.created", {"i": i})  # seq 1..3
    out = await bus.replay_since(0)
    assert [e["seq"] for e in out] == [1, 2, 3]
    assert RESYNC not in out


async def test_replay_since_resync_when_behind_buffer(bus):
    # Fill past the cap so the oldest seq is no longer 1.
    total = REPLAY_MAX + 10
    for i in range(total):
        await bus.publish("signal.created", {"i": i})
    # last_id=2 is older than the oldest buffered seq (total-REPLAY_MAX+1) -> resync
    out = await bus.replay_since(2)
    assert out[0] == RESYNC
    # remaining items are the newer events we can still replay
    assert all(e.get("seq", 0) > 2 for e in out[1:])


async def test_replay_since_up_to_date_returns_empty(bus):
    for i in range(3):
        await bus.publish("signal.created", {"i": i})  # seq 1..3
    # last_id == newest seq: client is exactly up to date -> nothing to replay.
    assert await bus.replay_since(3) == []


async def test_replay_since_resync_on_seq_space_reset(bus):
    # Seq-space reset blind spot: Redis was flushed/restarted so seq restarts at 1,
    # but the client reconnects with a stale high Last-Event-ID from the OLD space.
    # last_id (99) > newest buffered seq (3) -> must RESYNC, not silently drop the
    # new events the client has never seen.
    for i in range(3):
        await bus.publish("signal.created", {"i": i})  # seq 1..3
    out = await bus.replay_since(99)
    assert out[0] == RESYNC
    # the full current buffer follows so the client can repopulate after refetch
    assert [e["seq"] for e in out[1:]] == [1, 2, 3]


# --------------------------------------------------------- pub/sub round-trip
async def test_subscribe_receives_published_event(bus):
    received = []

    async def consume():
        async for env in bus.subscribe():
            received.append(env)
            break  # one event is enough

    task = asyncio.create_task(consume())
    await asyncio.sleep(0.05)  # let the subscriber attach
    await bus.publish("signal.created", {"ticker": "AAPL"})
    await asyncio.wait_for(task, timeout=2.0)
    assert len(received) == 1
    assert received[0]["type"] == "signal.created"
    assert received[0]["data"]["ticker"] == "AAPL"


# ----------------------------------------------------------------- degradation
async def test_publish_is_noop_when_unavailable():
    """A bus that never connected (Redis absent) returns None, does not raise."""
    b = EventBus()
    assert b.available is False
    assert await b.publish("signal.created", {"x": 1}) is None
    assert await b.replay_since(0) == []


async def test_publish_never_raises_when_redis_errors():
    """Even with a 'connected' bus whose client raises on every call, publish
    swallows the error and returns None — the guarantee that a Redis outage can't
    break a scan (realtime-live-backend §9). Uses a raising stub, so this runs
    with no redis/fakeredis dependency at all."""

    class BoomRedis:
        async def incr(self, *a, **k):
            raise ConnectionError("redis down")
        def pipeline(self, *a, **k):
            raise ConnectionError("redis down")
        async def lrange(self, *a, **k):
            raise ConnectionError("redis down")

    b = EventBus()
    b._redis = BoomRedis()
    b._connected = True
    assert await b.publish("signal.created", {"x": 1}) is None  # no raise
    assert await b.replay_since(0) == []                        # no raise


# ------------------------------------------------------------- SSE generator
class _FakeBus:
    """A minimal bus stand-in for driving the SSE generator without Redis.

    replay_since yields a fixed buffered event; subscribe blocks forever so the
    generator is forced onto its heartbeat path (asyncio.wait_for timeout).
    """

    def __init__(self, replay):
        self._replay = replay

    async def replay_since(self, last_id):
        return [e for e in self._replay if e.get("seq", 0) > last_id]

    async def subscribe(self):
        # never yields -> the generator must heartbeat
        await asyncio.Event().wait()
        yield  # pragma: no cover


class _FakeRequest:
    async def is_disconnected(self):
        return False


async def test_sse_generator_replays_then_heartbeats():
    from routes.stream import signal_event_generator

    buffered = {"v": 1, "type": "signal.created", "seq": 7, "ts": "t", "data": {"ticker": "AAPL"}}
    bus = _FakeBus(replay=[buffered])
    gen = signal_event_generator(_FakeRequest(), bus, last_id=0, heartbeat=0.05)

    # 1) first item is the replayed buffered event, with SSE id == seq
    first = await asyncio.wait_for(gen.__anext__(), timeout=2.0)
    assert first["event"] == "signal.created"
    assert first["id"] == "7"
    assert json.loads(first["data"])["data"]["ticker"] == "AAPL"

    # 2) next item is a heartbeat ping (subscribe never yields -> idle timeout)
    second = await asyncio.wait_for(gen.__anext__(), timeout=2.0)
    assert second == {"comment": "ping"}

    await gen.aclose()
