import { describe, expect, it } from 'vitest'

import { canCancelRun, canRetryRun } from './runState'

describe('run controls', () => {
  it.each(['FAILED', 'CANCELLED', 'RECOVERY_REQUIRED'] as const)(
    'allows retry for %s',
    (status) => {
      expect(canRetryRun(status)).toBe(true)
    },
  )

  it.each(['QUEUED', 'RUNNING', 'WAITING_USER', 'PAUSED', 'PAUSING'] as const)(
    'allows cancellation for %s',
    (status) => {
      expect(canCancelRun(status)).toBe(true)
    },
  )

  it('rejects controls for succeeded runs', () => {
    expect(canRetryRun('SUCCEEDED')).toBe(false)
    expect(canCancelRun('SUCCEEDED')).toBe(false)
  })
})
