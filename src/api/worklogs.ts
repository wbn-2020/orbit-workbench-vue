import { http } from './http'

import type { KnowledgeCard, WorkLog, WorkLogCategory } from './types'

export interface CreateWorkLogInput {
  title: string
  content: string
  category: WorkLogCategory
}

export type BackendWorkLogCategory = 'PROJECT' | 'INCIDENT' | 'DECISION' | 'LEARNING' | 'OTHER'

export interface BackendWorkLog extends Omit<WorkLog, 'category'> {
  category: BackendWorkLogCategory
}

export interface BackendKnowledgeCard extends Omit<KnowledgeCard, 'sourceLogId'> {
  sourceLogId: string | null
}

const WORK_LOG_CATEGORY_MAP: Record<BackendWorkLogCategory, WorkLogCategory> = {
  PROJECT: 'project',
  INCIDENT: 'incident',
  DECISION: 'decision',
  LEARNING: 'learning',
  OTHER: 'other',
}

export function transformWorkLog(log: BackendWorkLog): WorkLog {
  return {
    ...log,
    category: WORK_LOG_CATEGORY_MAP[log.category],
  }
}

export function transformKnowledgeCard(card: BackendKnowledgeCard): KnowledgeCard {
  return {
    ...card,
    sourceLogId: card.sourceLogId,
  }
}

export async function listWorkLogs(): Promise<WorkLog[]> {
  const { data } = await http.get<BackendWorkLog[]>('/work-logs')
  return data.map(transformWorkLog)
}

export async function createWorkLog(input: CreateWorkLogInput): Promise<WorkLog> {
  const { data } = await http.post<BackendWorkLog>('/work-logs', input)
  return transformWorkLog(data)
}

export async function distillWorkLog(id: string): Promise<KnowledgeCard> {
  const { data } = await http.post<BackendKnowledgeCard>(`/work-logs/${id}/distill`)
  return transformKnowledgeCard(data)
}

export async function listKnowledgeCards(): Promise<KnowledgeCard[]> {
  const { data } = await http.get<BackendKnowledgeCard[]>('/knowledge-cards')
  return data.map(transformKnowledgeCard)
}

export interface UpdateKnowledgeCardInput {
  title: string
  summary: string
  tags?: string[]
}

export async function updateKnowledgeCard(
  id: string,
  input: UpdateKnowledgeCardInput,
): Promise<KnowledgeCard> {
  const { data } = await http.put<BackendKnowledgeCard>(`/knowledge-cards/${id}`, {
    title: input.title.trim(),
    summary: input.summary.trim(),
    tags: input.tags ?? [],
  })
  return transformKnowledgeCard(data)
}
