import type { RunEvent } from '@/types/api'

export function parseRunEventPayload(
  data: string,
  lastEventId: string,
  fallbackType: string,
): RunEvent | null {
  try {
    const parsed = JSON.parse(data) as Partial<RunEvent> & Record<string, unknown>
    const sequenceFromId = Number(lastEventId)
    const sequence =
      typeof parsed.sequence === 'number'
        ? parsed.sequence
        : Number.isFinite(sequenceFromId)
          ? sequenceFromId
          : 0

    return {
      ...parsed,
      runId: typeof parsed.runId === 'number' ? parsed.runId : 0,
      sequence,
      type: parsed.type ?? fallbackType,
    } as RunEvent
  } catch {
    return null
  }
}

export function runEventText(event: RunEvent): string {
  if (typeof event.text === 'string') return event.text
  if (typeof event.data?.text === 'string') return event.data.text
  if (typeof event.data?.content === 'string') return event.data.content
  return ''
}

export type RunEventSequenceDecision = 'accept' | 'duplicate' | 'gap'

export function classifyRunEventSequence(
  lastSequence: number,
  incomingSequence: number,
): RunEventSequenceDecision {
  if (incomingSequence <= lastSequence) return 'duplicate'
  if (incomingSequence > lastSequence + 1) return 'gap'
  return 'accept'
}

export function runEventErrorSummary(event: RunEvent): string {
  if (event.summary) return event.summary
  if (typeof event.data?.errorSummary === 'string') return event.data.errorSummary
  if (typeof event.data?.message === 'string') return event.data.message
  return ''
}
