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
  /** V52：由哪条画像事实转化而来（普通目标无此字段） */
  sourceFactId?: number | null
  /** V58：从本目标拆出的任务总数（0 = 还没拆步骤，进度仍为手动值） */
  taskCount?: number
  /** V58：其中已完成的任务数（SKIPPED 不算完成） */
  completedTaskCount?: number
  /** V58：progress 是否已由任务派生（true 时手动 ± 调整被禁用） */
  progressDerived?: boolean
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

/** 管线体检单项；status：BLOCK 阻断 / ACTION 待处理 / STALE 节奏脱期。空数组=健康。 */
export interface PipelineCheck {
  key: string
  status: 'BLOCK' | 'ACTION' | 'STALE'
  title: string
  detail: string
  to: string
  action: string
}

export interface WorkbenchSummary {
  greeting: string
  modes: ModeCard[]
  assets: AssetCount[]
  agenda: AgendaItem[]
  focusTodayMinutes: number
  pipeline: PipelineCheck[]
}
