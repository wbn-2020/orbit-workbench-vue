import { describe, expect, it, vi } from 'vitest'

import { captureFocusStart, clearFocusStart } from '@/api/focus'

describe('focus timer start tracking', () => {
  it('records the actual start only when a focus phase begins', () => {
    const now = vi.fn(() => '2026-09-07T01:00:00.000Z')

    expect(captureFocusStart('focus', null, now)).toBe('2026-09-07T01:00:00.000Z')
    expect(now).toHaveBeenCalledOnce()
    expect(captureFocusStart('break', null, now)).toBeNull()
    expect(now).toHaveBeenCalledOnce()
  })

  it('preserves the initial timestamp when resuming after a pause', () => {
    const now = vi.fn(() => '2026-09-07T02:00:00.000Z')

    expect(captureFocusStart('focus', '2026-09-07T01:00:00.000Z', now)).toBe(
      '2026-09-07T01:00:00.000Z',
    )
    expect(now).not.toHaveBeenCalled()
  })

  it('clears the timestamp after reset or phase completion', () => {
    expect(clearFocusStart()).toBeNull()
  })
})
