import { http } from './http'

import type {
  AiConnection,
  AiConnectionPayload,
  AiConnectionUpdatePayload,
  ConnectionTestHistoryItem,
  ConnectionTestRequest,
  ConnectionTestResult,
  ModelProfile,
  PageResult,
  ProviderCatalog,
  SavedConnectionTestRequest,
} from '@/types/api'

export async function listProviderCatalogs(): Promise<ProviderCatalog[]> {
  const { data } = await http.get<ProviderCatalog[]>('/provider-catalogs')
  return data
}

export async function listAiConnections(
  page = 1,
  size = 50,
  enabled?: boolean,
): Promise<PageResult<AiConnection>> {
  const { data } = await http.get<PageResult<AiConnection>>('/ai-connections', {
    params: { page, size, enabled },
  })
  return data
}

export async function getAiConnection(id: number): Promise<AiConnection> {
  const { data } = await http.get<AiConnection>(`/ai-connections/${id}`)
  return data
}

export async function createAiConnection(
  payload: AiConnectionPayload,
): Promise<AiConnection> {
  const { data } = await http.post<AiConnection>('/ai-connections', payload)
  return data
}

export async function updateAiConnection(
  id: number,
  payload: AiConnectionUpdatePayload,
): Promise<AiConnection> {
  const { data } = await http.put<AiConnection>(`/ai-connections/${id}`, payload)
  return data
}

export async function setAiConnectionEnabled(
  id: number,
  enabled: boolean,
  expectedVersion: number,
): Promise<AiConnection> {
  const { data } = await http.put<AiConnection>(`/ai-connections/${id}/enabled`, {
    enabled,
    expectedVersion,
  })
  return data
}

export async function deleteAiConnection(id: number): Promise<void> {
  await http.delete(`/ai-connections/${id}`)
}

export async function testDraftAiConnection(
  payload: ConnectionTestRequest,
): Promise<ConnectionTestResult> {
  const { data } = await http.post<ConnectionTestResult>('/ai-connections/test', payload)
  return data
}

export async function testSavedAiConnection(
  id: number,
  payload: SavedConnectionTestRequest,
): Promise<ConnectionTestResult> {
  const { data } = await http.post<ConnectionTestResult>(
    `/ai-connections/${id}/test`,
    payload,
  )
  return data
}

export async function listConnectionModelProfiles(id: number): Promise<ModelProfile[]> {
  const { data } = await http.get<ModelProfile[]>(
    `/ai-connections/${id}/model-profiles`,
  )
  return data
}

export async function listConnectionTests(
  id: number,
  page = 1,
  size = 5,
): Promise<PageResult<ConnectionTestHistoryItem>> {
  const { data } = await http.get<PageResult<ConnectionTestHistoryItem>>(
    `/ai-connections/${id}/tests`,
    { params: { page, size } },
  )
  return data
}

/**
 * 联网检索形状（ADR-0012）。选项文字与前提是界面的职责，
 * 「能不能联网、能不能必搜」由后端连接上的声明决定，界面不自己推断。
 */
export interface WebSearchDialectOption {
  value: string
  label: string
  protocol: 'ANY' | 'CHAT_COMPLETIONS' | 'RESPONSES'
  forced: boolean
  hint: string
}

export const WEB_SEARCH_DIALECTS: WebSearchDialectOption[] = [
  { value: 'NONE', label: '不联网（默认）', protocol: 'ANY', forced: false,
    hint: '任何请求都不会带联网参数。' },
  { value: 'RESPONSES_TOOL', label: 'Responses 内置检索（模型自决）', protocol: 'RESPONSES', forced: false,
    hint: '发 tools:[{type:"web_search"}]，检索与否由模型判断，因此无法承诺一定联网。' },
  { value: 'RESPONSES_TOOL_FORCED', label: 'Responses 内置检索（可强制）', protocol: 'RESPONSES', forced: true,
    hint: '额外用 tool_choice 指名检索工具，才能支持「必须联网」。DeepSeek 的检索只在 Responses 协议上有，Chat Completions 没有。' },
  { value: 'OPENAI_CHAT_WEB_SEARCH_OPTIONS', label: 'OpenAI Chat 检索参数', protocol: 'CHAT_COMPLETIONS', forced: false,
    hint: '发顶层 web_search_options，只有搜索专用预览模型可用；套餐与模型门槛请自行确认。' },
  { value: 'QWEN_CHAT_ENABLE_SEARCH', label: 'Qwen 兼容模式检索', protocol: 'CHAT_COMPLETIONS', forced: true,
    hint: '发顶层 enable_search（必搜时加 search_options.forced_search）。按次计费、限流 15 RPS 且超限时不报错只是不检索；第三方网关可能不透传这个非标准参数。' },
  { value: 'XAI_CHAT_SEARCH_PARAMETERS', label: 'xAI Chat 检索参数', protocol: 'CHAT_COMPLETIONS', forced: true,
    hint: '发顶层 search_parameters.mode=auto/on。键名取自官方 SDK，上线前建议真实跑一次核对。' },
]

/** ON_DEMAND 在后端语义是「必须联网」，界面不许再写成含糊的「按需」。 */
export type WebSearchPolicy = 'DISABLED' | 'ON_DEMAND' | 'AUTO'

export const WEB_SEARCH_POLICY_LABELS: Record<WebSearchPolicy, string> = {
  DISABLED: '不联网',
  ON_DEMAND: '必须联网',
  AUTO: '自动（模型自决）',
}

export function webSearchDialectOptions(protocol: string): WebSearchDialectOption[] {
  return WEB_SEARCH_DIALECTS.filter((option) =>
    option.protocol === 'ANY' || option.protocol === protocol)
}

export function webSearchDialectLabel(value?: string | null): string {
  return WEB_SEARCH_DIALECTS.find((option) => option.value === value)?.label ?? '不联网（默认）'
}

export function webSearchDialectHint(value?: string | null): string {
  return WEB_SEARCH_DIALECTS.find((option) => option.value === value)?.hint ?? ''
}

export interface WebSearchPolicyChoice {
  value: WebSearchPolicy
  label: string
  disabled: boolean
  note: string
}

/**
 * 面试创建页的三档可用性。未指定账户时由场景路由决定，界面无从预知，
 * 所以只在选了具体连接时才做能力门槛；服务端始终是自己拒绝的那一道。
 */
export function webSearchPolicyChoices(connection?: {
  webSearchSupported?: boolean
  forcedSearchSupported?: boolean
} | null): WebSearchPolicyChoice[] {
  const known = Boolean(connection)
  const searchable = Boolean(connection?.webSearchSupported)
  const forced = Boolean(connection?.forcedSearchSupported)
  return [
    { value: 'DISABLED', label: WEB_SEARCH_POLICY_LABELS.DISABLED, disabled: false, note: '' },
    {
      value: 'ON_DEMAND',
      label: WEB_SEARCH_POLICY_LABELS.ON_DEMAND,
      disabled: known && !forced,
      note: known && !forced
        ? '这条连接没有声明可强制检索的形状，选它会在出题时被直接拒绝而不是静默不搜；可用「自动」或到 AI 连接里改声明。'
        : '',
    },
    {
      value: 'AUTO',
      label: WEB_SEARCH_POLICY_LABELS.AUTO,
      disabled: false,
      note: known && !searchable
        ? '这条连接未声明联网形状，选「自动」本次仍按不联网调用（会在调用审计里留下原因）。'
        : '',
    },
  ]
}
