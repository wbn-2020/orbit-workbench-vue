import { http } from './http'

/* 用户画像事实（个人记忆层）—— 对应后端 /user-facts。
   只有 CONFIRMED 会被注入出题与知识问答；AI 建议先进候选池。 */

export type UserFactStatus = 'ANALYZED' | 'CONFIRMED' | 'ARCHIVED'
export type UserFactType =
  | 'PREFERENCE'
  | 'KNOWLEDGE'
  | 'CONTEXT'
  | 'BEHAVIOR'
  | 'GOAL'
  | 'OTHER'

export interface UserFact {
  id: number
  factType: UserFactType
  title: string
  content: string
  source: 'AI_SUGGESTED' | 'USER_ENTERED'
  status: UserFactStatus
  confidence: number | null
  confirmedAt: string | null
  archivedReason: string | null
  createdAt: string
}

export interface DistillResult {
  suggestions: UserFact[]
  skippedLowConfidence: number
}

export const USER_FACT_TYPE_LABELS: Record<UserFactType, string> = {
  PREFERENCE: '偏好',
  KNOWLEDGE: '技能知识',
  CONTEXT: '背景',
  BEHAVIOR: '行为模式',
  GOAL: '目标',
  OTHER: '其他',
}

export async function listUserFacts(): Promise<UserFact[]> {
  const { data } = await http.get<{ items: UserFact[] }>('/user-facts')
  return data.items
}

export async function createUserFact(payload: {
  factType: UserFactType
  title: string
  content: string
}): Promise<UserFact> {
  const { data } = await http.post<UserFact>('/user-facts', payload)
  return data
}

export async function distillUserFacts(): Promise<DistillResult> {
  const { data } = await http.post<DistillResult>('/user-facts/distill')
  return data
}

export async function confirmUserFact(
  id: number,
  payload: { factType: UserFactType; title: string; content: string },
): Promise<UserFact> {
  const { data } = await http.put<UserFact>(`/user-facts/${id}/confirm`, payload)
  return data
}

export async function archiveUserFact(id: number): Promise<UserFact> {
  const { data } = await http.post<UserFact>(`/user-facts/${id}/archive`)
  return data
}
