import { http } from './http'

import type {
  AgentRunSummary,
  PageResult,
  TaskDetail,
  TaskPayload,
  RunStatus,
  TaskStatus,
  TaskSummary,
  TaskUpdatePayload,
} from '@/types/api'

export interface TaskListQuery {
  workspaceId?: number
  status?: TaskStatus
  moduleType?: 'TECH_LEARNING' | 'DATA_ANALYSIS'
  page?: number
  size?: number
}

export async function listTasks(query: TaskListQuery = {}): Promise<PageResult<TaskSummary>> {
  const { data } = await http.get<PageResult<TaskSummary>>('/tasks', { params: query })
  return data
}

export async function createTask(
  payload: TaskPayload,
  idempotencyKey: string,
): Promise<TaskDetail> {
  const { data } = await http.post<TaskDetail>('/tasks', payload, {
    headers: { 'Idempotency-Key': idempotencyKey },
  })
  return data
}

export async function getTask(id: number): Promise<TaskDetail> {
  const { data } = await http.get<TaskDetail>(`/tasks/${id}`)
  return data
}

export async function listTaskRuns(
  id: number,
): Promise<AgentRunSummary[]> {
  const { data } = await http.get<AgentRunSummary[]>(`/tasks/${id}/runs`)
  return data
}

export async function updateTask(id: number, payload: TaskUpdatePayload): Promise<TaskDetail> {
  const { data } = await http.put<TaskDetail>(`/tasks/${id}`, payload)
  return data
}

export interface StartTaskRunResponse {
  runId: number
  status: RunStatus
  taskStatus: TaskStatus
  command: 'START'
  retryOfRunId?: number | null
}

export async function startTaskRun(id: number): Promise<StartTaskRunResponse> {
  const { data } = await http.post<StartTaskRunResponse>(`/tasks/${id}/runs`, {})
  return data
}
