import { describe, expect, it, vi } from 'vitest'

import { useSubmissionLock } from './useSubmissionLock'

describe('useSubmissionLock', () => {
  it('allows only one in-flight submission', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const action = vi.fn(() => pending)
    const lock = useSubmissionLock()

    const first = lock.run(action)
    const second = await lock.run(action)

    expect(lock.submitting.value).toBe(true)
    expect(action).toHaveBeenCalledTimes(1)
    expect(second).toBeUndefined()

    release()
    await first
    expect(lock.submitting.value).toBe(false)
  })

  it('releases the lock after a failed submission', async () => {
    const lock = useSubmissionLock()

    await expect(lock.run(() => Promise.reject(new Error('failed')))).rejects.toThrow('failed')

    expect(lock.submitting.value).toBe(false)
  })
})
