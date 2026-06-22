/**
 * useSignalStream hook — EventSource connection-state transitions.
 *
 * Strategy: stub `window.EventSource` with a minimal fake, render the hook,
 * fire events on the captured instance, and assert Zustand store state.
 * No network I/O; fully synchronous after renderHook.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSignalStream } from '@/hooks/useSignalStream'
import { useSignalStore } from '@/lib/signalStore'

// ---------------------------------------------------------------------------
// Minimal EventSource mock
// ---------------------------------------------------------------------------
class MockEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  readyState = MockEventSource.CONNECTING
  onopen: ((ev: Event) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  onmessage: ((ev: MessageEvent) => void) | null = null

  private _listeners = new Map<string, Set<EventListener>>()
  static lastInstance: MockEventSource | null = null

  constructor(public url: string) {
    MockEventSource.lastInstance = this
  }

  addEventListener(type: string, fn: EventListener) {
    if (!this._listeners.has(type)) this._listeners.set(type, new Set())
    this._listeners.get(type)!.add(fn)
  }

  removeEventListener(type: string, fn: EventListener) {
    this._listeners.get(type)?.delete(fn)
  }

  /** Dispatch a named SSE event the way the browser would. */
  dispatchNamed(type: string, payload: unknown, id = '') {
    const ev = new MessageEvent(type, {
      data: JSON.stringify(payload),
      lastEventId: id,
    })
    this._listeners.get(type)?.forEach((fn) => fn(ev))
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function resetStore() {
  useSignalStore.setState({ connectionState: 'connecting', signals: [], lastEventId: null })
}

describe('useSignalStream', () => {
  beforeEach(() => {
    MockEventSource.lastInstance = null
    vi.stubGlobal('EventSource', MockEventSource)
    // Also stub fetch used by refetchRankings
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    resetStore()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets connectionState to "connecting" immediately on mount', () => {
    renderHook(() => useSignalStream())
    expect(useSignalStore.getState().connectionState).toBe('connecting')
    expect(MockEventSource.lastInstance).not.toBeNull()
  })

  it('transitions to "live" when EventSource opens', () => {
    renderHook(() => useSignalStream())

    act(() => {
      MockEventSource.lastInstance!.onopen!(new Event('open'))
    })

    expect(useSignalStore.getState().connectionState).toBe('live')
  })

  it('transitions to "degraded" when EventSource errors while reconnecting', () => {
    renderHook(() => useSignalStream())

    act(() => {
      const es = MockEventSource.lastInstance!
      es.readyState = MockEventSource.CONNECTING  // browser retrying
      es.onerror!(new Event('error'))
    })

    expect(useSignalStore.getState().connectionState).toBe('degraded')
  })

  it('transitions to "closed" when EventSource is permanently closed on error', () => {
    renderHook(() => useSignalStream())

    act(() => {
      const es = MockEventSource.lastInstance!
      es.readyState = MockEventSource.CLOSED
      es.onerror!(new Event('error'))
    })

    expect(useSignalStore.getState().connectionState).toBe('closed')
  })

  it('transitions to "closed" on unmount and closes the EventSource', () => {
    const { unmount } = renderHook(() => useSignalStream())

    act(() => {
      MockEventSource.lastInstance!.onopen!(new Event('open'))
    })
    expect(useSignalStore.getState().connectionState).toBe('live')

    act(() => {
      unmount()
    })

    expect(useSignalStore.getState().connectionState).toBe('closed')
    expect(MockEventSource.lastInstance!.readyState).toBe(MockEventSource.CLOSED)
  })

  it('upserts a signal into the store on signal.created event', () => {
    renderHook(() => useSignalStream())

    const mockSignal = {
      id: 'sig-001',
      ticker: 'AAPL',
      direction: 'LONG' as const,
      score: 82,
      strategy_hits: { strategies: ['macd_signal'] },
      entry_price: 190,
      stop_loss: 185,
      tp1: 195,
      tp2: 200,
      risk_reward: 2.5,
      ceiling_score: 40,
      created_at: '2026-06-20T00:00:00Z',
    }

    act(() => {
      MockEventSource.lastInstance!.dispatchNamed('signal.created', {
        v: 1,
        type: 'signal.created',
        data: mockSignal,
      })
    })

    const signals = useSignalStore.getState().signals
    expect(signals).toHaveLength(1)
    expect(signals[0].ticker).toBe('AAPL')
    expect(signals[0].score).toBe(82)
  })
})
