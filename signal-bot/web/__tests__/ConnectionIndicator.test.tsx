/**
 * ConnectionIndicator — renders the correct label and aria-label for every
 * ConnectionState value. Uses getByRole("status") for accessible assertions.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ConnectionIndicator from '@/components/dashboard/ConnectionIndicator'
import type { ConnectionState } from '@/lib/signalStore'

const CASES: Array<[ConnectionState, string]> = [
  ['live', 'ライブ'],
  ['connecting', '接続中'],
  ['degraded', '再接続中'],
  ['closed', '切断'],
]

describe('ConnectionIndicator', () => {
  it.each(CASES)('shows correct label for state "%s"', (state, label) => {
    render(<ConnectionIndicator state={state} />)

    const el = screen.getByRole('status')
    expect(el.getAttribute('aria-label')).toBe(`リアルタイム接続: ${label}`)
    expect(screen.getByText(label)).toBeDefined()
  })

  it('has aria-live="polite" for screen-reader announcements', () => {
    render(<ConnectionIndicator state="live" />)
    const el = screen.getByRole('status')
    expect(el.getAttribute('aria-live')).toBe('polite')
  })
})
