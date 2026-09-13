import { http } from './http'

export interface UsageRow {
  key: string
  calls: number
  succeeded: number
  failed: number
  inputTokens: number
  outputTokens: number
  // 后端 Jackson 省略 null：无单价/无 token 时该键整个缺失（undefined），消费处必须宽松判空
  costAmount?: number | null
  unpricedCalls: number
}

export interface UsageSummary {
  calls: number
  succeeded: number
  failed: number
  inputTokens: number
  outputTokens: number
  costAmount?: number | null
  pricedCalls: number
  unpricedCalls: number
}

export interface AiUsage {
  days: number
  from: string
  total: UsageSummary
  byDay: UsageRow[]
  byScenario: UsageRow[]
  byModel: UsageRow[]
  anyPricingConfigured: boolean
}

export async function getAiUsage(days = 30): Promise<AiUsage> {
  const { data } = await http.get<AiUsage>('/ai-usage', { params: { days } })
  return data
}

const SCENARIO_LABELS: Record<string, string> = {
  INTERVIEW_QUESTION: '面试出题',
  INTERVIEW_REPORT: '面试报告',
  PROJECT_FACT: '项目画像/蒸馏',
  KNOWLEDGE_ANSWER: '知识库问答',
  USER_FACT: '用户画像沉淀',
}

export function scenarioLabel(code: string): string {
  return SCENARIO_LABELS[code] ?? code
}
