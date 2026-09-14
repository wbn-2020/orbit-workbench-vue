import { http } from './http'

/* 可复用「本事」（craft）—— 对应后端 /crafts。
   存的是「怎么做这类事」的套路（讲述结构 / 话术 / 排查步骤 / 复盘方法），
   与知识块（技术点）和画像事实（我是谁）区分。AI 建议先进候选池，确认后进库。 */

export type CraftCategory = 'STORY' | 'SCRIPT' | 'PLAYBOOK' | 'REVIEW' | 'OTHER'
export type CraftStatus = 'ANALYZED' | 'CONFIRMED' | 'ARCHIVED'

export interface CraftNote {
  id: number
  category: CraftCategory
  title: string
  whenToUse: string
  content: string
  tags: string[]
  source: 'AI_SUGGESTED' | 'USER_ENTERED'
  status: CraftStatus
  confidence: number | null
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveCraftPayload {
  category: CraftCategory
  title: string
  whenToUse: string
  content: string
  tags: string[]
}

export const CRAFT_CATEGORY_LABELS: Record<CraftCategory, string> = {
  STORY: '讲述结构',
  SCRIPT: '话术模板',
  PLAYBOOK: '执行套路',
  REVIEW: '复盘方法',
  OTHER: '其他',
}

export async function listCrafts(): Promise<CraftNote[]> {
  const { data } = await http.get<{ items: CraftNote[] }>('/crafts')
  return data.items
}

export async function createCraft(payload: SaveCraftPayload): Promise<CraftNote> {
  const { data } = await http.post<CraftNote>('/crafts', payload)
  return data
}

export async function updateCraft(id: number, payload: SaveCraftPayload): Promise<CraftNote> {
  const { data } = await http.put<CraftNote>(`/crafts/${id}`, payload)
  return data
}

export async function confirmCraft(id: number, payload: SaveCraftPayload): Promise<CraftNote> {
  const { data } = await http.put<CraftNote>(`/crafts/${id}/confirm`, payload)
  return data
}

export async function archiveCraft(id: number): Promise<CraftNote> {
  const { data } = await http.post<CraftNote>(`/crafts/${id}/archive`)
  return data
}

export async function pinCraft(id: number, pinned: boolean): Promise<CraftNote> {
  const { data } = await http.post<CraftNote>(`/crafts/${id}/pin`, { pinned })
  return data
}

export async function distillCrafts(): Promise<CraftNote[]> {
  const { data } = await http.post<{ suggestions: CraftNote[] }>('/crafts/distill')
  return data.suggestions
}
