import { describe, expect, it } from 'vitest'

import {
  classifyRunEventSequence,
  parseRunEventPayload,
  runEventErrorSummary,
  runEventText,
} from './runEvents'

describe('parseRunEventPayload', () => {
  it('uses the payload sequence and type when present', () => {
    const event = parseRunEventPayload(
      '{"runId":7,"sequence":12,"type":"output.text.delta","text":"hello"}',
      '11',
      'message',
    )

    expect(event).toMatchObject({
      runId: 7,
      sequence: 12,
      type: 'output.text.delta',
      text: 'hello',
    })
  })

  it('falls back to the SSE id and listener type', () => {
    const event = parseRunEventPayload('{"runId":7}', '15', 'run.completed')

    expect(event).toMatchObject({
      runId: 7,
      sequence: 15,
      type: 'run.completed',
    })
  })

  it('rejects invalid JSON', () => {
    expect(parseRunEventPayload('{invalid', '1', 'message')).toBeNull()
  })
})

describe('runEventText', () => {
  it('reads nested text used by backend SSE payloads', () => {
    expect(
      runEventText({
        runId: 7,
        sequence: 1,
        type: 'output.text.delta',
        data: { text: 'delta' },
      }),
    ).toBe('delta')
  })
})

describe('classifyRunEventSequence', () => {
  it('accepts only the next contiguous sequence', () => {
    expect(classifyRunEventSequence(0, 1)).toBe('accept')
    expect(classifyRunEventSequence(4, 5)).toBe('accept')
  })

  it('detects duplicates and gaps without advancing the cursor', () => {
    expect(classifyRunEventSequence(4, 4)).toBe('duplicate')
    expect(classifyRunEventSequence(4, 3)).toBe('duplicate')
    expect(classifyRunEventSequence(4, 6)).toBe('gap')
  })
})

describe('runEventErrorSummary', () => {
  it('reads the persisted summary before nested error details', () => {
    expect(
      runEventErrorSummary({
        runId: 7,
        sequence: 3,
        type: 'run.failed',
        summary: 'persisted failure',
        data: { errorSummary: 'nested failure' },
      }),
    ).toBe('persisted failure')
  })
})
