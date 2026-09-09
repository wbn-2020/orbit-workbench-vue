// v2 领域类型定义（前端先行，后端按此契约实现）
// src/api/* 的转换层把后端大写枚举映射为这里的小写 UI 契约。

export type WorkLogCategory = 'project' | 'incident' | 'decision' | 'learning' | 'other'

export interface WorkLog {
  id: string
  title: string
  content: string
  category: WorkLogCategory
  createdAt: string
  distilled: boolean
}

export interface KnowledgeCard {
  id: string
  title: string
  summary: string
  sourceLogId: string | null
  tags: string[]
  createdAt: string
  reviewStage?: number
  nextReviewDate?: string | null
  lastReviewedAt?: string | null
}

export type LearningGoalStatus = 'active' | 'paused' | 'done'

export interface LearningGoal {
  id: string
  title: string
  reason: string
  status: LearningGoalStatus
  progress: number
  linkedSkill?: string
}

export interface FocusStat {
  date: string
  focusMinutes: number
  sessions: number
}

export interface FocusSession {
  id: string
  startedAt: string
  durationMinutes: number
  mode: 'focus' | 'break'
  label?: string
}

export type WorkMode = 'market-sensing' | 'work-sedimentation' | 'learning-update'

export interface ModeCard {
  key: WorkMode
  title: string
  description: string
  to: string
  metricLabel: string
  metricValue: string
}

export interface AssetCount {
  key: string
  label: string
  to: string
  count: number
}

export interface AgendaItem {
  id: string
  time: string
  title: string
  done: boolean
}

export interface WorkbenchSummary {
  greeting: string
  modes: ModeCard[]
  assets: AssetCount[]
  agenda: AgendaItem[]
  focusTodayMinutes: number
}
