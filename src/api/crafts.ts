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
  /** 是否已有对应练习任务（V49） */
  practiced: boolean
  /** 完成练习任务的次数（V50） */
  practiceCount: number
  /** 最近一次完成练习任务的时间（V50） */
  lastPracticedAt: string | null
  /** 已练熟 = 至少完成过一次练习任务，后端派生（V50） */
  mastered: boolean
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

/** V49：把已确认套路转成复习计划里的练习任务（幂等，created=0 表示已存在）。 */
export async function createCraftPracticeTask(id: number): Promise<number> {
  const { data } = await http.post<{ created: number }>(`/crafts/${id}/practice-task`)
  return data.created
}

export async function distillCrafts(): Promise<CraftNote[]> {
  const { data } = await http.post<{ suggestions: CraftNote[] }>('/crafts/distill')
  return data.suggestions
}

/** V51：面试弱项 → 套路推荐（后端纯派生，无 AI）。 */
export interface WeaknessCraftRecommendation {
  dimension: string
  score: number
  craftId: number
  craftTitle: string
  craftCategory: CraftCategory
  whenToUse: string
  mastered: boolean
}

export interface CraftRecommendations {
  items: WeaknessCraftRecommendation[]
  basis: string
}

export async function craftRecommendations(): Promise<CraftRecommendations> {
  const { data } = await http.get<CraftRecommendations>('/crafts/recommendations')
  return { items: data.items ?? [], basis: data.basis ?? '' }
}

/** V54：已练熟套路的练前后分数对比（后端纯派生；相关非因果）。 */
export type CraftEffectStatus = 'IMPROVED' | 'DECLINED' | 'FLAT' | 'INSUFFICIENT'

export interface CraftEffect {
  craftId: number
  dimension: string
  beforeCount: number
  beforeAvg: number | null
  afterCount: number
  afterAvg: number | null
  status: CraftEffectStatus
}

export const CRAFT_EFFECT_LABELS: Record<CraftEffectStatus, string> = {
  IMPROVED: '练后均分上升',
  DECLINED: '练后均分回落',
  FLAT: '练后基本持平',
  INSUFFICIENT: '样本还不够看',
}

export async function craftEffects(): Promise<CraftEffect[]> {
  const { data } = await http.get<{ items: CraftEffect[] }>('/crafts/effects')
  // 后端 non_null 序列化：均分为 null 时键直接缺席，归一化成显式 null
  return (data.items ?? []).map((item) => ({
    ...item,
    beforeAvg: item.beforeAvg ?? null,
    afterAvg: item.afterAvg ?? null,
  }))
}
