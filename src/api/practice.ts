import { cleanParams, http } from './http'

import type {
  PracticeDetailResponse,
  PracticeImportResponse,
  PracticeItem,
  PracticeListQuery,
  PracticeListResponse,
  PracticeMastery,
  PracticeResult,
  PracticeSource,
  PracticeSummary,
} from '@/types/api'

export interface PracticeAttemptPayload {
  answer: string
  result: PracticeResult
  selfScore?: number | null
  feedback?: string | null
}

export interface PracticeCreatePayload {
  topic: string
  question: string
  referenceAnswer?: string | null
}

/** `expectedUpdatedAt` 取自条目当前的 `updatedAt`，与服务端不一致时返回 409 而不是覆盖。 */
export interface PracticeClassificationPayload {
  topic: string
  referenceAnswer?: string | null
  nextReviewDate?: string | null
  expectedUpdatedAt: string
}

export async function listPracticeItems(query: PracticeListQuery = {}): Promise<PracticeListResponse> {
  const { data } = await http.get<PracticeListResponse>('/practice-items', {
    params: cleanParams(query),
  })
  return data
}

export async function getPracticeSummary(archived?: string | null): Promise<PracticeSummary> {
  const { data } = await http.get<PracticeSummary>('/practice-items/summary', {
    params: cleanParams({ archived }),
  })
  return data
}

export async function getPracticeDetail(itemId: number): Promise<PracticeDetailResponse> {
  const { data } = await http.get<PracticeDetailResponse>(`/practice-items/${itemId}`)
  return data
}

export async function createPracticeItem(payload: PracticeCreatePayload): Promise<PracticeItem> {
  const { data } = await http.post<PracticeItem>('/practice-items', payload)
  return data
}

export async function importFromReport(sessionId: number): Promise<PracticeImportResponse> {
  const { data } = await http.post<PracticeImportResponse>(`/practice-items/from-report/${sessionId}`)
  return data
}

export async function importFromSession(sessionId: number): Promise<PracticeImportResponse> {
  const { data } = await http.post<PracticeImportResponse>(`/practice-items/from-session/${sessionId}`)
  return data
}

/** 提交一次重练：后端插入一条尝试后回全量详情，掌握状态由尝试历史重算。 */
export async function addPracticeAttempt(
  itemId: number,
  payload: PracticeAttemptPayload,
): Promise<PracticeDetailResponse> {
  const { data } = await http.post<PracticeDetailResponse>(`/practice-items/${itemId}/attempts`, payload)
  return data
}

/** V57：一道错题 → 治这类错的候选套路（纯关键词派生，匹配不上时 items 为空并给出如实说明）。 */
export interface WrongAnswerCraftCandidate {
  craftId: number
  title: string
  category: string
  whenToUse: string | null
  matchedDimension: string
  mastered: boolean
}

export interface WrongAnswerCraftSuggestion {
  items: WrongAnswerCraftCandidate[]
  note: string | null
}

export async function getWrongAnswerCraftSuggestion(
  itemId: number,
): Promise<WrongAnswerCraftSuggestion> {
  const { data } = await http.get<WrongAnswerCraftSuggestion>(
    `/practice-items/${itemId}/craft-suggestion`,
  )
  return data
}

export async function updatePracticeClassification(
  itemId: number,
  payload: PracticeClassificationPayload,
): Promise<PracticeItem> {
  const { data } = await http.post<PracticeItem>(`/practice-items/${itemId}/classification`, payload)
  return data
}

export async function archivePracticeItem(itemId: number): Promise<PracticeItem> {
  const { data } = await http.post<PracticeItem>(`/practice-items/${itemId}/archive`)
  return data
}

export async function unarchivePracticeItem(itemId: number): Promise<PracticeItem> {
  const { data } = await http.post<PracticeItem>(`/practice-items/${itemId}/unarchive`)
  return data
}

export const MASTERY_LABELS: Record<PracticeMastery, string> = {
  NEW: '未练过',
  LEARNING: '巩固中',
  MASTERED: '已掌握',
}

export const MASTERY_TAG_CLASS: Record<PracticeMastery, string> = {
  NEW: 'gray',
  LEARNING: 'orange',
  MASTERED: 'green',
}

export const RESULT_LABELS: Record<PracticeResult, string> = {
  RETRY: '没答上来',
  PARTIAL: '答了一部分',
  PASSED: '答通了',
}

export const SOURCE_LABELS: Record<PracticeSource, string> = {
  REPORT: '来自报告薄弱点',
  INTERVIEW_TURN: '来自面试轮次',
  MANUAL: '手工新增',
}

export const REVIEW_DATE_SOURCE_LABELS = {
  MANUAL: '手工设定',
  RULE: '规则排期',
} as const
