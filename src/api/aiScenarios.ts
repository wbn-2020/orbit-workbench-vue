import { http } from './http'

/* AI 场景绑定与调用审计 —— 对应后端 /ai-scenarios（场景级主备账户 + 真实调用留痕） */

export type AiScenario = 'INTERVIEW_QUESTION' | 'INTERVIEW_REPORT' | 'PROJECT_FACT' | 'KNOWLEDGE_ANSWER' | 'USER_FACT'

/** ROUTE：已显式配置；DEFAULT：未配置，回退"第一个已启用账户" */
export type AiScenarioSource = 'ROUTE' | 'DEFAULT'

export interface ScenarioRoute {
  scenario: AiScenario
  scenarioLabel: string
  source: AiScenarioSource
  primaryConnectionId: number | null
  primaryConnectionName: string | null
  backupConnectionId: number | null
  backupConnectionName: string | null
  failoverEnabled: boolean
  version: number
  updatedAt: string | null
}

export interface ScenarioRoutePayload {
  primaryConnectionId: number
  backupConnectionId: number | null
  failoverEnabled: boolean
}

export interface CallAudit {
  id: number
  scenario: AiScenario
  scenarioLabel: string
  primaryConnectionId: number
  usedConnectionId: number
  usedConnectionName: string | null
  backupAttempted: boolean
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  /** 后端按 non_null 序列化，成功行会省略该键 */
  errorCode?: string | null
  latencyMs?: number | null
  requestChars: number
  responseChars: number
  /** token 明细（V42）：后端按 non_null 序列化，历史行或上游没报都会省略键，消费处必须宽松判空 */
  inputTokens?: number | null
  outputTokens?: number | null
  cachedInputTokens?: number | null
  reasoningOutputTokens?: number | null
  costAmount?: number | null
  createdAt: string
  finishedAt: string | null
}

export interface PageResult<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export async function listScenarioRoutes(): Promise<ScenarioRoute[]> {
  const { data } = await http.get<ScenarioRoute[]>('/ai-scenarios')
  return data
}

export async function saveScenarioRoute(
  scenario: AiScenario,
  payload: ScenarioRoutePayload,
): Promise<ScenarioRoute> {
  const { data } = await http.put<ScenarioRoute>(`/ai-scenarios/${scenario}`, payload)
  return data
}

export async function removeScenarioRoute(scenario: AiScenario): Promise<void> {
  await http.delete(`/ai-scenarios/${scenario}`)
}

export async function listCallAudits(
  page = 1,
  size = 10,
  scenario?: AiScenario,
): Promise<PageResult<CallAudit>> {
  const { data } = await http.get<PageResult<CallAudit>>('/ai-scenarios/audits', {
    params: { page, size, scenario },
  })
  return data
}

export const AI_SCENARIO_HINTS: Record<AiScenario, string> = {
  INTERVIEW_QUESTION: '面试房间里的 AI 出题与动态追问',
  INTERVIEW_REPORT: '结束面试后生成的 11 维评分报告',
  PROJECT_FACT: '项目画像事实的 AI 分析',
  KNOWLEDGE_ANSWER: '知识库带来源问答',
  USER_FACT: '用户画像事实沉淀（个人记忆层）',
}

export function aiAuditStatusLabel(status: CallAudit['status']): string {
  if (status === 'SUCCEEDED') return '成功'
  if (status === 'FAILED') return '失败'
  return '进行中'
}
