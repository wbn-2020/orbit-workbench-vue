import { http } from './http'
import { consumeSse } from './sse'

/* 面试主链 / 报告 / 复习计划 —— 对应后端 /interview-sessions 与 /study-tasks */

export type InterviewSessionStatus =
  | 'READY' | 'RUNNING' | 'PAUSED' | 'USER_ENDED'
  | 'COMPLETING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface ProjectBindingSnapshot {
  projectId: number
  projectName: string
  versionId: number
  versionNumber: number
  factCount: number
}

export interface WebSearchOutcome {
  requested: string | null
  dialect: string | null
  applied: string | null
  note: string | null
}

export const WEB_SEARCH_APPLIED_LABELS: Record<string, string> = {
  APPLIED: '本场出题带了联网检索',
  DEGRADED: '本场按不联网出题',
  NOT_REQUESTED: '本场未请求联网',
}

export function webSearchAppliedLabel(applied?: string | null): string {
  if (!applied) return '联网结论未定（还没出过题）'
  return WEB_SEARCH_APPLIED_LABELS[applied] ?? `联网结论 ${applied}`
}

export interface InterviewSession {
  id: number
  title: string
  topicMode: string
  form: string
  round: string
  interviewerId: number | null
  interviewerName: string | null
  aiConnectionId: number | null
  aiModel: string | null
  webSearchPolicy: string | null
  /** 出题时固化的联网结论（V32）：当次形状、实际是否联网、降级原因。 */
  webSearchOutcome?: WebSearchOutcome | null
  targetRole: string | null
  targetExperienceBand: string | null
  questionLimit: number
  followUpLimit: number
  turnLimit: number
  durationLimitMinutes: number
  scheduledAt: string | null
  projectBindings: ProjectBindingSnapshot[]
  knowledgeBindingCount: number
  status: InterviewSessionStatus
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface InterviewTurn {
  id: number
  turnNo: number
  turnType: 'MAIN' | 'FOLLOW_UP'
  question: string
  answer: string | null
  answerSource: string | null
  createdAt: string
  answeredAt: string | null
}

export interface InterviewReport {
  id: number
  sessionId: number
  status: 'REPORT_PENDING' | 'REPORT_FAILED' | 'REPORT_READY'
  totalScore: number | null
  dimensionScoresJson: string | null
  hiringRecommendation: string | null
  strengthsJson: string | null
  weaknessesJson: string | null
  followUpFindingsJson: string | null
  projectMasteryJson: string | null
  knowledgeGapsJson: string | null
  studySuggestionsJson: string | null
  failureReason: string | null
  retryCount: number
  generatedAt: string | null
  /** 失败归因（后端派生）：人话摘要 + 下一步建议；非失败态为空。 */
  failureSummary?: string | null
  failureNextStep?: string | null
}

export type StudyTaskStatus =
  | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'POSTPONED' | 'SKIPPED'

export interface StudyTask {
  id: number
  sourceType: 'MANUAL' | 'REPORT' | 'WORKBENCH'
  sourceId: number | null
  title: string
  topic: string | null
  taskType: string | null
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedMinutes: number | null
  dueDate: string | null
  status: StudyTaskStatus
  manual: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSessionPayload {
  title: string
  topicMode: string
  form: string
  round: string
  interviewerId?: number
  interviewerName?: string
  targetRole?: string
  targetExperienceBand?: string
  questionLimit: number
  followUpLimit: number
  turnLimit: number
  durationLimitMinutes: number
  scheduledAt?: string | null
  aiConnectionId?: number | null
  webSearchPolicy?: string
  projectBindings?: { projectId: number; versionId: number }[]
  /** 不传=默认注入最近蒸馏的 5 条；空数组=显式不注入（后端据此区分）。 */
  knowledgeCardIds?: number[]
}

export interface KnowledgeCardOption {
  id: string
  title: string
  summary: string
  tags: string[]
  createdAt: string
}

export async function listKnowledgeCardOptions(): Promise<KnowledgeCardOption[]> {
  const { data } = await http.get<
    { id: string; title: string; summary: string; sourceLogId: string | null; tags: string[]; createdAt: string }[]
  >('/knowledge-cards')
  return data.map((card) => ({
    id: card.id,
    title: card.title,
    summary: card.summary,
    tags: card.tags ?? [],
    createdAt: card.createdAt,
  }))
}

export const TOPIC_MODES = [
  { value: 'ROTE', label: '八股文专项训练' },
  { value: 'PROJECT_DEEP_DIVE', label: '技术面（项目深挖）' },
  { value: 'AI_TECH', label: 'AI 技术专项训练' },
  { value: 'CODE_REVIEW', label: '代码判断/审查' },
  { value: 'FULL_PROCESS', label: '企业完整流程（模拟）' },
  { value: 'TRANSITION_TEACHING', label: '转行入门教学' },
] as const

export async function createSession(payload: CreateSessionPayload): Promise<InterviewSession> {
  const { data } = await http.post<InterviewSession>('/interview-sessions', payload)
  return data
}

export async function listSessions(status?: string): Promise<InterviewSession[]> {
  const { data } = await http.get<InterviewSession[]>('/interview-sessions', {
    params: status ? { status } : {},
  })
  return data
}

export async function getSession(id: number): Promise<{ session: InterviewSession; turns: InterviewTurn[] }> {
  const { data } = await http.get(`/interview-sessions/${id}`)
  return data
}

async function sessionAction(id: number, action: string): Promise<InterviewSession> {
  const { data } = await http.post<InterviewSession>(`/interview-sessions/${id}/${action}`)
  return data
}

export const startSession = (id: number) => sessionAction(id, 'start')
export const pauseSession = (id: number) => sessionAction(id, 'pause')
export const resumeSession = (id: number) => sessionAction(id, 'resume')
export const cancelSession = (id: number) => sessionAction(id, 'cancel')
export const endSession = (id: number) => sessionAction(id, 'end')

export async function nextQuestion(
  sessionId: number,
  turnType: 'MAIN' | 'FOLLOW_UP',
  instruction?: string,
): Promise<InterviewTurn> {
  const { data } = await http.post<InterviewTurn>(
    `/interview-sessions/${sessionId}/questions/next`,
    { turnType, instruction: instruction || undefined },
  )
  return data
}

export interface StreamHandlers {
  onStart?: (info: { turnNo: number; type: string }) => void
  onDelta?: (text: string) => void
  onError?: (message: string) => void
}

/**
 * SSE 流式出题（fetch ReadableStream，逐字回调；done 事件返回落库后的完整轮次）。
 */
export async function streamNextQuestion(
  sessionId: number,
  turnType: 'MAIN' | 'FOLLOW_UP',
  handlers: StreamHandlers,
  instruction?: string,
): Promise<void> {
  const csrf = document.cookie
    .split('; ')
    .find((item) => item.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  const response = await fetch(`/api/v1/interview-sessions/${sessionId}/questions/next/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf) } : {}),
    },
    body: JSON.stringify({ turnType, instruction: instruction || undefined }),
  })
  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`
    try {
      const problem = await response.json()
      detail = problem.detail || problem.title || detail
    } catch {
      /* 保留状态码信息 */
    }
    throw new Error(detail)
  }

  await consumeSse(response.body, (event, data) => {
      if (event === 'start') {
        handlers.onStart?.(JSON.parse(data))
      } else if (event === 'delta') {
        handlers.onDelta?.(data)
      } else if (event === 'done') {
        const payload = JSON.parse(data) as { turnId: number; turnNo: number; question: string }
        if (!payload.turnId || !payload.question) throw new Error('出题完成事件无效')
        handlers.onDelta?.(`__DONE__${JSON.stringify(payload)}`)
      } else if (event === 'error') {
        handlers.onError?.(data)
      }
  })
}

export async function submitAnswer(
  sessionId: number,
  turnId: number,
  answer: string,
  answerSource = 'INDEPENDENT',
): Promise<InterviewTurn> {
  const { data } = await http.post<InterviewTurn>(
    `/interview-sessions/${sessionId}/turns/${turnId}/answer`,
    { answer, answerSource },
  )
  return data
}

export interface ReportState { exists: boolean; report: InterviewReport | null }

export async function getReport(sessionId: number): Promise<ReportState> {
  const { data } = await http.get<ReportState>(`/interview-sessions/${sessionId}/report`)
  return data
}

export async function generateReport(sessionId: number, connectionId?: number): Promise<ReportState> {
  const { data } = await http.post<ReportState>(
    `/interview-sessions/${sessionId}/report/generate`,
    connectionId ? { connectionId } : {},
  )
  return data
}

export async function retryReport(sessionId: number): Promise<ReportState> {
  const { data } = await http.post<ReportState>(`/interview-sessions/${sessionId}/report/retry`)
  return data
}

export async function listStudyTasks(status?: string): Promise<StudyTask[]> {
  const { data } = await http.get<StudyTask[]>('/study-tasks', {
    params: status ? { status } : {},
  })
  return data
}

export async function createStudyTask(payload: {
  title: string
  priority: string
  topic?: string
  taskType?: string
  estimatedMinutes?: number
  dueDate?: string | null
}): Promise<StudyTask> {
  const { data } = await http.post<StudyTask>('/study-tasks', payload)
  return data
}

async function taskAction(id: number, action: string, body?: unknown): Promise<StudyTask> {
  const { data } = await http.post<StudyTask>(`/study-tasks/${id}/${action}`, body ?? {})
  return data
}

export const startTask = (id: number) => taskAction(id, 'start')
export const completeTask = (id: number) => taskAction(id, 'complete')
export const skipTask = (id: number) => taskAction(id, 'skip')
export const postponeTask = (id: number, dueDate: string) =>
  taskAction(id, 'postpone', { dueDate })

export async function deleteTask(id: number): Promise<void> {
  await http.delete(`/study-tasks/${id}`)
}

export async function generateTasksFromReport(sessionId: number): Promise<{ created: number }> {
  const { data } = await http.post<{ created: number }>(`/study-tasks/from-report/${sessionId}`)
  return data
}

export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : []
  } catch {
    return []
  }
}

export function parseDims(value: string | null | undefined): Record<string, number> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    const result: Record<string, number> = {}
    Object.entries(parsed).forEach(([key, raw]) => {
      const num = Number(raw)
      if (Number.isFinite(num)) result[key] = num
    })
    return result
  } catch {
    return {}
  }
}

/**
 * 回答来源取值由 V23 的 `chk_interview_turn_source` 固定，标签统一放这里
 * （错题本与报告中心共用一套说法，避免同一枚举在两处翻译成不同的词）。
 */
export const ANSWER_SOURCE_LABELS: Record<string, string> = {
  INDEPENDENT: '独立作答',
  PROMPTED: '提示后作答',
  AI_ASSISTED: 'AI 辅助作答',
  AI_GENERATED: 'AI 生成作答',
  HISTORY_IMPORT: '历史导入',
}

export function answerSourceLabel(value: string | null | undefined): string {
  if (!value) return '未记录来源'
  return ANSWER_SOURCE_LABELS[value] ?? value
}

export interface ReportStreamHandlers {
  onDelta?: (text: string) => void
  onDone?: () => void
  onError?: (message: string) => void
}

/**
 * SSE 流式报告生成：增量仅用于等待期展示，报告以 done 后刷新到的正式数据为准。
 */
export async function streamGenerateReport(
  sessionId: number,
  connectionId: number | undefined,
  handlers: ReportStreamHandlers,
): Promise<void> {
  const csrf = document.cookie
    .split('; ')
    .find((item) => item.startsWith('XSRF-TOKEN='))
    ?.split('=')[1]
  const response = await fetch(`/api/v1/interview-sessions/${sessionId}/report/generate/stream`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf) } : {}),
    },
    body: JSON.stringify(connectionId ? { connectionId } : {}),
  })
  if (!response.ok || !response.body) {
    let detail = `HTTP ${response.status}`
    try {
      const problem = await response.json()
      detail = problem.detail || problem.title || detail
    } catch {
      /* 保留状态码信息 */
    }
    throw new Error(detail)
  }

  await consumeSse(response.body, (event, data) => {
      if (event === 'delta') {
        handlers.onDelta?.(data)
      } else if (event === 'done') {
        if (JSON.parse(data).reportReady !== true) throw new Error('报告完成事件无效')
        handlers.onDone?.()
        return
      } else if (event === 'error') {
        handlers.onError?.(data)
        return
      }
  })
}
