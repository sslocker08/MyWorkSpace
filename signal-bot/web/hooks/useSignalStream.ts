'use client'
/**
 * Live signal stream hook — wraps a native EventSource onto the Zustand store.
 *
 * SSE event-NAME matching (must mirror engine/routes/stream.py):
 *   stream.py's `_sse_event` ALWAYS sets the SSE `event:` field to the envelope's
 *   `type` (the namespaced verb): "signal.created", "signal.updated",
 *   "scan.completed", plus the control types "resync" and "degraded". Because the
 *   `event:` field is set, the browser dispatches these as NAMED events, so a
 *   plain `onmessage` ("message" event) handler would NEVER fire for them. We
 *   therefore addEventListener for each named type. We ALSO attach an onmessage
 *   fallback that reads the envelope's own `type` field, so the client still works
 *   if the server is ever changed to send unnamed `data:` frames.
 *
 * Reconnect/resume: the browser's EventSource auto-reconnects with backoff and
 * auto-sends the Last-Event-ID header (set from each event's SSE `id:` = seq).
 * We do NOT reimplement reconnection. On a "resync" control event (the server's
 * aged-buffer / seq-reset recovery path) we refetch the full ranking via REST.
 *
 * Lifecycle: opens once on mount, closes on unmount (no leak across navigations).
 */
import { useEffect, useRef } from 'react'
import { useSignalStore, type Signal, type ConnectionState } from '@/lib/signalStore'

const STREAM_URL = '/api/stream/signals'
const RESYNC_URL = '/api/signals/?limit=50&status=ACTIVE'

/** SSE envelope shape (engine/core/event_bus.py _make_envelope). */
interface Envelope {
  v: number
  type: string
  seq?: number
  ts?: string
  data?: unknown
}

export interface UseSignalStreamResult {
  /** Coarse status for the UI indicator. */
  connectionState: ConnectionState
}

export function useSignalStream(): UseSignalStreamResult {
  const upsertSignal = useSignalStore((s) => s.upsertSignal)
  const setSignals = useSignalStore((s) => s.setSignals)
  const setConnectionState = useSignalStore((s) => s.setConnectionState)
  const setLastEventId = useSignalStore((s) => s.setLastEventId)
  const connectionState = useSignalStore((s) => s.connectionState)

  // Guard against double-processing a resync while one is in flight.
  const resyncing = useRef(false)

  useEffect(() => {
    // EventSource is browser-only; this hook runs in a Client Component so it is
    // safe, but bail defensively if the global is somehow absent (SSR/tests).
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return
    }

    setConnectionState('connecting')
    const es = new EventSource(STREAM_URL)

    const refetchRankings = async () => {
      if (resyncing.current) return
      resyncing.current = true
      try {
        const res = await fetch(RESYNC_URL)
        if (!res.ok) return
        const data = await res.json()
        setSignals((data.signals as Signal[]) || [])
      } catch {
        // Network blip — EventSource will keep retrying; leave state as-is.
      } finally {
        resyncing.current = false
      }
    }

    const applySignal = (env: Envelope) => {
      if (env.data && typeof env.data === 'object') {
        upsertSignal(env.data as Signal)
      }
    }

    /** Route one parsed envelope by its `type`. Shared by named + fallback paths. */
    const handleEnvelope = (env: Envelope, eventId: string | null) => {
      if (eventId) setLastEventId(eventId)
      switch (env.type) {
        case 'signal.created':
        case 'signal.updated':
          applySignal(env)
          break
        case 'scan.completed':
          // A scan finished; rankings may have shifted beyond the per-signal
          // events we received. Refetch to be authoritative.
          void refetchRankings()
          break
        case 'resync':
          // Server told us we fell behind the replay buffer (or seq reset):
          // recover by refetching the full ranking via REST.
          void refetchRankings()
          break
        case 'degraded':
          setConnectionState('degraded')
          break
        default:
          break
      }
    }

    const parse = (raw: string): Envelope | null => {
      try {
        return JSON.parse(raw) as Envelope
      } catch {
        return null
      }
    }

    // Named-event listener factory (stream.py sets the SSE `event:` field).
    const named =
      (type: Envelope['type']) => (ev: MessageEvent) => {
        const env = parse(ev.data) || ({ v: 1, type } as Envelope)
        // Trust the SSE event name; fall back to the parsed body's type.
        handleEnvelope({ ...env, type: env.type || type }, ev.lastEventId || null)
      }

    const listeners: Array<[string, (ev: MessageEvent) => void]> = [
      ['signal.created', named('signal.created')],
      ['signal.updated', named('signal.updated')],
      ['scan.completed', named('scan.completed')],
      ['resync', named('resync')],
      ['degraded', named('degraded')],
    ]
    for (const [type, fn] of listeners) {
      es.addEventListener(type, fn as EventListener)
    }

    // Fallback for unnamed `data:` frames (default "message" event): read the
    // envelope's own `type`. Harmless when the server names events (this won't fire).
    const onMessage = (ev: MessageEvent) => {
      const env = parse(ev.data)
      if (env) handleEnvelope(env, ev.lastEventId || null)
    }
    es.onmessage = onMessage

    es.onopen = () => {
      // A successful (re)connection: clear any degraded state back to live.
      setConnectionState('live')
    }

    es.onerror = () => {
      // EventSource auto-reconnects unless it is CLOSED. Reflect reconnecting vs
      // permanently-closed so the indicator is honest.
      if (es.readyState === EventSource.CLOSED) {
        setConnectionState('closed')
      } else {
        // CONNECTING (the browser is retrying) — surface as degraded.
        setConnectionState('degraded')
      }
    }

    return () => {
      for (const [type, fn] of listeners) {
        es.removeEventListener(type, fn as EventListener)
      }
      es.onmessage = null
      es.onopen = null
      es.onerror = null
      es.close()
      setConnectionState('closed')
    }
    // Store actions from zustand are stable; intentionally run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { connectionState }
}
