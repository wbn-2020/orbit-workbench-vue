export interface PageResult<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export interface ProblemDetail {
  type?: string
  title: string
  status: number
  detail?: string
  instance?: string
  errorCode?: string
  traceId?: string
  fieldErrors?: Record<string, string>
}

export interface CsrfToken {
  headerName: string
  token: string
}

export interface SetupStatus {
  initialized: boolean
}

export interface CurrentUser {
  id: number
  username: string
}

export interface Workspace {
  id: number
  name: string
  description?: string | null
  isDefault?: boolean
  status?: string
  createdAt?: string
  updatedAt?: string
}

export type TaskStatus =
  | 'DRAFT'
  | 'READY'
  | 'RUNNING'
  | 'WAITING_USER'
  | 'PAUSED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'ARCHIVED'

export type RunStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'WAITING_USER'
  | 'PAUSING'
  | 'CANCELLING'
  | 'RECOVERY_REQUIRED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'

export type Priority = 'LOW' | 'NORMAL' | 'HIGH'
export type ModuleType = 'TECH_LEARNING'
export type ArtifactType = 'LEARNING_NOTE' | 'QUIZ' | 'SUMMARY' | string

export interface TaskSummary {
  id: number
  workspaceId: number
  connectionId: number | null
  moduleType: ModuleType
  title: string
  description: string | null
  expectedArtifactType: ArtifactType
  priority: Priority
  status: TaskStatus
  currentRunId: number | null
  currentRunStatus: RunStatus | null
  documentIds: number[]
  createdAt: string
  updatedAt: string
}

export type TaskDetail = TaskSummary

export interface TaskPayload {
  workspaceId: number
  moduleType: ModuleType
  title: string
  description: string
  expectedArtifactType: ArtifactType
  priority: Priority
  documentIds: number[]
  connectionId: number
}

export type TaskUpdatePayload = Omit<TaskPayload, 'workspaceId'>

export interface AgentRunSummary {
  id: number
  taskId: number
  status: RunStatus
  agentDefinitionId?: number | null
  connectionId?: number | null
  retryOfRunId?: number | null
  successorRunId?: number | null
  currentStep?: string | null
  lastSequence?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  lastHeartbeatAt?: string | null
  createdAt?: string
  updatedAt?: string
  errorCode?: string | null
  errorSummary?: string | null
  traceId?: string | null
  modelCalls?: ModelCallSummary[]
}

export interface ModelCallSummary {
  id: number
  connectionId: number
  connectionName?: string
  modelName?: string
  protocol?: AiProtocol
  streaming: boolean
  status: string
  latencyMs?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  providerRequestId?: string | null
  errorCode?: string | null
  errorSummary?: string | null
  startedAt?: string | null
  finishedAt?: string | null
}

export interface RunEvent {
  id?: number
  runId: number
  modelCallId?: number | null
  sequence: number
  type: RunEventType | string
  summary?: string | null
  data?: Record<string, unknown> | null
  text?: string
  occurredAt?: string
}

export interface AgentRunDetail extends AgentRunSummary {
  agentDefinitionId: number | null
  connectionId: number | null
  successorRunId: number | null
  lastHeartbeatAt: string | null
  traceId: string | null
  lastSequence: number
  modelCalls: ModelCallSummary[]
}

export type RunEventType =
  | 'run.started'
  | 'output.text.delta'
  | 'output.text.completed'
  | 'tool.call.started'
  | 'tool.call.arguments.delta'
  | 'tool.call.completed'
  | 'usage.updated'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'
  | 'run.pause.requested'
  | 'run.paused'
  | 'run.resumed'
  | 'run.cancel.requested'
  | 'connection.tested'

export type ProviderType =
  | 'OPENAI'
  | 'DEEPSEEK'
  | 'XAI'
  | 'CUSTOM_OPENAI_COMPATIBLE'

export type AiProtocol = 'CHAT_COMPLETIONS' | 'RESPONSES'
export type ConnectionTestStatus = 'SUCCESS' | 'FAILED' | 'STALE' | 'UNTESTED' | 'NOT_TESTED'

export interface ProviderCatalog {
  id: number
  providerCode: ProviderType
  displayName: string
  adapterType: string
  defaultProtocols: AiProtocol[]
  capabilities: Record<string, unknown>
  enabled: boolean
}

export interface AiConnection {
  id: number
  version: number
  name: string
  providerType: ProviderType
  baseUrl: string
  endpointPath: string
  protocol: AiProtocol
  modelName: string
  credentialMasked?: string
  timeoutMs?: number
  enabled: boolean
  lastTestStatus?: ConnectionTestStatus | null
  lastTestLatencyMs?: number | null
  lastTestedAt?: string | null
  lastErrorCode?: string | null
  lastErrorSummary?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface AiConnectionPayload {
  name: string
  providerType: ProviderType
  baseUrl: string
  endpointPath: string
  protocol: AiProtocol
  modelName: string
  apiKey?: string
  timeoutMs: number
  enabled: boolean
}

export interface AiConnectionUpdatePayload extends AiConnectionPayload {
  expectedVersion: number
}

export interface ConnectionTestRequest {
  name: string
  providerType: ProviderType
  baseUrl: string
  endpointPath: string
  protocol: AiProtocol
  modelName: string
  apiKey: string
  timeoutMs: number
  streaming: boolean
  testPrompt?: string
}

export interface SavedConnectionTestRequest {
  streaming: boolean
  testPrompt?: string
}

export interface ConnectionTestResult {
  status: 'SUCCESS' | 'FAILED'
  protocol: AiProtocol
  streaming: boolean
  latencyMs?: number | null
  httpStatus?: number | null
  eventCount?: number | null
  doneMarkerReceived?: boolean | null
  errorCode?: string | null
  errorSummary?: string | null
}

export interface ModelProfile {
  id: number
  connectionId: number
  modelName: string
  displayName?: string | null
  supportedProtocols: AiProtocol[]
  capabilities: Record<string, unknown>
  defaultParameters: Record<string, unknown>
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ConnectionTestHistoryItem {
  id: number
  connectionId: number
  protocol: AiProtocol
  modelName: string
  streaming: boolean
  status: 'SUCCESS' | 'FAILED'
  httpStatus?: number | null
  latencyMs?: number | null
  eventCount: number
  doneMarkerReceived: boolean
  errorCode?: string | null
  errorSummary?: string | null
  testedAt?: string
}

export type DocumentParseStatus = 'PENDING' | 'PARSING' | 'READY' | 'FAILED'

export interface DocumentSummary {
  id: number
  workspaceId: number
  fileName?: string
  originalName?: string
  sizeBytes: number
  mediaType: string
  parseStatus: DocumentParseStatus
  errorSummary?: string | null
  createdAt?: string
}

export interface DocumentDetail extends DocumentSummary {
  content?: string | null
}

export interface ArtifactSummary {
  id: number
  taskId: number
  taskTitle?: string
  title: string
  artifactType: ArtifactType
  currentVersion: number
  updatedAt?: string
  createdAt?: string
}

export interface ArtifactVersionSummary {
  id: number
  artifactId: number
  version: number
  contentFormat: string
  sourceRunId?: number | null
  changeSummary?: string | null
  createdAt?: string
}

export interface ArtifactVersion extends ArtifactVersionSummary {
  content: string
}

export interface ArtifactDetail extends ArtifactSummary {
  content: string
}

export interface ArtifactUpdatePayload {
  title: string
  content: string
  expectedVersion: number
}
