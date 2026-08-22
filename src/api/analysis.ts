import { http } from './http'

import type {
  DataAnalysisTaskDetail,
  DataAnalysisTaskPayload,
  DataAnalysisTaskUpdatePayload,
} from '@/types/api'

export async function createDataAnalysisTask(
  payload: DataAnalysisTaskPayload,
  idempotencyKey: string,
): Promise<DataAnalysisTaskDetail> {
  const { data } = await http.post<DataAnalysisTaskDetail>(
    '/data-analysis/tasks',
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}

export async function getDataAnalysisTask(
  taskId: number,
): Promise<DataAnalysisTaskDetail> {
  const { data } = await http.get<DataAnalysisTaskDetail>(
    `/data-analysis/tasks/${taskId}`,
  )
  return data
}

export async function updateDataAnalysisTask(
  taskId: number,
  payload: DataAnalysisTaskUpdatePayload,
): Promise<DataAnalysisTaskDetail> {
  const { data } = await http.put<DataAnalysisTaskDetail>(
    `/data-analysis/tasks/${taskId}`,
    payload,
  )
  return data
}
