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
  /** 用户最后一次确认「仍然成立」的时间（V43）；候选池为 null */
  lastSeenAt: string | null
  /** 距上次确认是否已过时效阈值（后端判定，前端不重复实现规则） */
  stale: boolean
  /** 距上次确认的天数；从未确认为 null */
  staleDays: number | null
  /** 被组装进 AI 请求的次数（V46 用量治理）；从未注入为 0 */
  injectionCount: number
  lastInjectedAt: string | null
  /** 冷记忆：已确认但从未被注入过 */
  cold: boolean
  /** V52：这条事实已转成学习目标（后端按 learning_goal 派生） */
  goalDerived: boolean
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

/** 复查：确认这条已确认事实仍然成立，刷新其时效（V43）。 */
export async function reaffirmUserFact(id: number): Promise<UserFact> {
  const { data } = await http.post<UserFact>(`/user-facts/${id}/reaffirm`)
  return data
}

/* ---- 画像编译快照（V44，借鉴 EvoFlow 两阶段记忆固化） ---- */

export interface ProfileDigest {
  id: number
  digest: string
  sourceCount: number
  model: string | null
  compiledAt: string
  /** 编译后事实集有新增/归档：注入已自动回退逐条模式 */
  stale: boolean
  factsAdded: number
  factsRemoved: number
}

/** 当前快照；从未编译过后端返回 204，这里归一为 null。 */
export async function getProfileDigest(): Promise<ProfileDigest | null> {
  const { data, status } = await http.get<ProfileDigest | ''>('/user-facts/digest')
  return status === 204 || !data ? null : (data as ProfileDigest)
}

/** 编译：同步调模型，耗时可到分钟级。 */
export async function compileProfileDigest(): Promise<ProfileDigest> {
  const { data } = await http.post<ProfileDigest>('/user-facts/digest')
  return data
}

export async function deleteProfileDigest(): Promise<void> {
  await http.delete('/user-facts/digest')
}

/* ---- 近期关注（V46，借鉴 EvoFlow 记忆结构 topOfMind） ---- */

export interface FocusNote {
  id: number
  content: string
  expiresAt: string | null
  /** 已过失效时刻：不再注入但保留，供用户更新或清除 */
  expired: boolean
  updatedAt: string
}

/** 当前关注；未设置过后端返回 204，这里归一为 null。 */
export async function getFocusNote(): Promise<FocusNote | null> {
  const { data, status } = await http.get<FocusNote | ''>('/user-facts/focus')
  return status === 204 || !data ? null : (data as FocusNote)
}

export async function saveFocusNote(payload: {
  content: string
  expiresInDays: number | null
}): Promise<FocusNote> {
  const { data } = await http.put<FocusNote>('/user-facts/focus', payload)
  return data
}

export async function deleteFocusNote(): Promise<void> {
  await http.delete('/user-facts/focus')
}

/** 天数转人话，用于「N 个月前确认」提示。 */
export function describeAge(days: number | null): string {
  if (days == null) return '未知'
  if (days < 30) return `${days} 天`
  if (days < 365) return `${Math.round(days / 30)} 个月`
  return `${Math.round(days / 365)} 年`
}
