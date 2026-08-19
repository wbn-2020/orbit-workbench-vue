import { http } from './http'

import type {
  AgentRunDetail,
  RunEvent,
  RunEventType,
  RunStatus,
} from '@/types/api'
import { parseRunEventPayload } from '@/utils/runEvents'

const RUN_EVENT_TYPES: RunEventType[] = [
  'run.started',
  'output.text.delta',
  'output.text.completed',
  'tool.call.started',
  'tool.call.arguments.delta',
  'tool.call.completed',
  'usage.updated',
  'run.completed',
  'run.failed',
  'run.cancelled',
  'run.pause.requested',
  'run.paused',
  'run.resumed',
  'run.cancel.requested',
  'connection.tested',
]

export interface RunCommandResponse {
  runId: number
  status: RunStatus
  taskStatus: string | null
  command: 'PAUSE' | 'RESUME' | 'CANCEL' | 'RETRY'
  retryOfRunId?: number | null
}

export async function getAgentRun(id: number): Promise<AgentRunDetail> {
  const { data } = await http.get<AgentRunDetail>(`/agent-runs/${id}`)
  return data
}

export async function pauseAgentRun(id: number): Promise<RunCommandResponse> {
  const { data } = await http.post<RunCommandResponse>(`/agent-runs/${id}/pause`)
  return data
}

export async function resumeAgentRun(id: number): Promise<RunCommandResponse> {
  const { data } = await http.post<RunCommandResponse>(`/agent-runs/${id}/resume`)
  return data
}

export async function cancelAgentRun(id: number): Promise<RunCommandResponse> {
  const { data } = await http.post<RunCommandResponse>(`/agent-runs/${id}/cancel`)
  return data
}

export async function retryAgentRun(id: number): Promise<RunCommandResponse> {
  const { data } = await http.post<RunCommandResponse>(`/agent-runs/${id}/retry`)
  return data
}

export interface RunEventStreamOptions {
  afterSequence?: number
  onOpen?: () => void
  onEvent: (event: RunEvent) => void
  onError?: (event: Event) => void
}

export function buildRunEventStreamUrl(
  runId: number,
  afterSequence?: number,
): string {
  const query = new URLSearchParams()
  if (afterSequence !== undefined && afterSequence >= 0) {
    query.set('afterSequence', String(afterSequence))
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : ''
  return `/api/v1/agent-runs/${runId}/events${suffix}`
}

function parseRunEvent(message: MessageEvent<string>, fallbackType: string): RunEvent | null {
  return parseRunEventPayload(message.data, message.lastEventId, fallbackType)
}

export function openRunEventStream(
  runId: number,
  options: RunEventStreamOptions,
): EventSource {
  const source = new EventSource(buildRunEventStreamUrl(runId, options.afterSequence), {
    withCredentials: true,
  })

  source.onopen = () => options.onOpen?.()
  source.onerror = (event) => options.onError?.(event)

  const handle = (type: string) => (event: Event) => {
    const parsed = parseRunEvent(event as MessageEvent<string>, type)
    if (parsed) options.onEvent(parsed)
  }

  source.onmessage = handle('message')
  RUN_EVENT_TYPES.forEach((type) => source.addEventListener(type, handle(type)))
  return source
}
