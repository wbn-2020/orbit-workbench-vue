import { describe, expect, it } from 'vitest'

import { buildRunEventStreamUrl } from './agentRuns'

describe('buildRunEventStreamUrl', () => {
  it('keeps afterSequence=0 for the first full replay', () => {
    expect(buildRunEventStreamUrl(12, 0)).toBe(
      '/api/v1/agent-runs/12/events?afterSequence=0',
    )
  })

  it('reconnects from the last contiguous cursor', () => {
    expect(buildRunEventStreamUrl(12, 8)).toBe(
      '/api/v1/agent-runs/12/events?afterSequence=8',
    )
  })
})
