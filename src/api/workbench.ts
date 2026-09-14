import { http } from './http'

import type { WorkbenchSummary } from './types'

export async function getWorkbenchSummary(): Promise<WorkbenchSummary> {
  const { data } = await http.get<WorkbenchSummary>('/workbench/summary')
  return data
}

export interface DailyPoint {
  date: string
  focusMinutes: number
  workLogs: number
  knowledgeCards: number
}

export interface WorkStats {
  total: number
  byCategory: Record<string, number>
  distilled: number
  pendingDistill: number
}

export interface LearningStats {
  newGoals: number
  doneGoals: number
}

export interface StudyStats {
  completed: number
  created: number
  outstanding: number
}

export interface InterviewStats {
  sessions: number
  scored: number
  avgScore: number | null
  crossVersionSamples: number
  byRecommendation: Record<string, number>
}

export interface PeriodTotals {
  focusMinutes: number
  workLogs: number
  knowledgeCards: number
  studyCompleted: number
}

export interface Reflection {
  period: 'week' | 'month'
  offset: number
  rangeStart: string
  rangeEnd: string
  label: string
  work: WorkStats
  learning: LearningStats
  study: StudyStats
  interview: InterviewStats
  daily: DailyPoint[]
  previous: PeriodTotals
  scoringRuleVersion: string
}

/** period=week|month；offset=0 当前周期，-1 上一周期，最多回溯 24。 */
export async function getReflection(period: 'week' | 'month', offset = 0): Promise<Reflection> {
  const { data } = await http.get<Reflection>('/workbench/reflection', {
    params: { period, offset },
  })
  return data
}

/** V55：成长脉络——溯源链接聚合出的链（后端只读派生，断环如实缺位）。 */
export type ThreadKind = 'FACT' | 'GOAL' | 'CRAFT' | 'TASK' | 'REPORT'

export interface ThreadStep {
  kind: ThreadKind
  refId: number
  title: string
  status: string
  to: string
}

export interface GrowthThread {
  type: 'CRAFT' | 'FACT' | 'REPORT'
  origin: ThreadStep[]
  steps: ThreadStep[]
  effect: 'IMPROVED' | 'DECLINED' | 'FLAT' | 'INSUFFICIENT' | null
}

export async function getGrowthThreads(): Promise<GrowthThread[]> {
  const { data } = await http.get<{ items: GrowthThread[] }>('/workbench/growth-threads')
  return data.items ?? []
}
