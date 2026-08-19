import { describe, expect, it } from 'vitest'

import { createIdempotencyKey } from './idempotency'

describe('createIdempotencyKey', () => {
  it('creates distinct keys within the requested operation scope', () => {
    const first = createIdempotencyKey('task-create')
    const second = createIdempotencyKey('task-create')

    expect(first).toMatch(/^task-create:/)
    expect(second).toMatch(/^task-create:/)
    expect(first).not.toBe(second)
  })
})
