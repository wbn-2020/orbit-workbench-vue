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

export type CareerStage = 'GRADUATE' | 'CAREER_TRANSITION' | 'JOB_CHANGE'
export type ExperienceBand =
  | 'GRADUATE'
  | 'ONE_TO_THREE_YEARS'
  | 'THREE_TO_FIVE_YEARS'
  | 'FIVE_PLUS_YEARS'
  | 'CUSTOM'
export type SkillLevel = 'BEGINNER' | 'WORKING_KNOWLEDGE' | 'PRACTICAL' | 'ADVANCED'

export interface JobProfile {
  id: number
  targetRole: string
  targetExperienceBand: ExperienceBand
  careerStage: CareerStage
  targetLevel: string | null
  targetCompany: string | null
  javaSkillLevel: SkillLevel
  aiSkillLevel: SkillLevel
  targetInterviewDate: string | null
  createdAt: string
  updatedAt: string
}

export interface JobProfileState {
  completed: boolean
  profile: JobProfile | null
}

export interface JobProfilePayload {
  targetRole: string
  targetExperienceBand: ExperienceBand
  careerStage: CareerStage
  targetLevel: string | null
  targetCompany: string | null
  javaSkillLevel: SkillLevel
  aiSkillLevel: SkillLevel
  targetInterviewDate: string | null
}

export type ProjectFileStatus = 'PARSED' | 'EXCLUDED' | 'FAILED'
export type ProjectVersionStatus = 'REVIEW_REQUIRED' | 'PARTIAL' | 'PUBLISHED'
export type KnowledgeBuildStatus = 'PENDING' | 'BUILDING' | 'READY' | 'FAILED'

export interface ProjectFile {
  id: number
  relativePath: string
  mediaType: string | null
  sizeBytes: number
  status: ProjectFileStatus
  statusReason: string | null
}

export interface ProjectVersion {
  id: number
  versionNumber: number
  sourceType: 'ZIP' | 'FILE' | 'GITHUB'
  sourceFileName: string
  status: ProjectVersionStatus
  knowledgeBuildStatus: KnowledgeBuildStatus | null
  knowledgeChunkCount: number
  knowledgeBuildAttempts: number
  knowledgeBuildError: string | null
  knowledgeBuiltAt: string | null
  totalFileCount: number
  parsedFileCount: number
  excludedFileCount: number
  failedFileCount: number
  totalSizeBytes: number
  createdAt: string
  files: ProjectFile[] | null
}

export interface ProjectSummary {
  id: number
  workspaceId: number
  name: string
  status: string
  latestVersion: ProjectVersion | null
  createdAt: string
  updatedAt: string
}

export interface ProjectDetail extends Omit<ProjectSummary, 'latestVersion'> {
  versions: ProjectVersion[]
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
  | 'WAITING_APPROVAL'
  | 'PAUSING'
  | 'CANCELLING'
  | 'RECOVERY_REQUIRED'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'

export type Priority = 'LOW' | 'NORMAL' | 'HIGH'
export type ModuleType = 'TECH_LEARNING' | 'DATA_ANALYSIS' | 'CONTENT_CREATION'
export type ArtifactType =
  | 'LEARNING_NOTE'
  | 'QUIZ'
  | 'SUMMARY'
  | 'ANALYSIS_REPORT'
  | 'CHART_SPEC'
  | 'DATA_EXPORT'
  | 'CONTENT_DRAFT'
  | 'CONTENT_REVIEW'
  | string

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
  agentVersionId?: number | null
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
  agentDefinitionName?: string | null
  agentDefinitionVersion?: number | null
  promptTemplateId?: number | null
  promptVersionId?: number | null
  promptVersionNumber?: number | null
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
  agentVersionId?: number | null
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
  | 'tool.call.requested'
  | 'tool.call.completed'
  | 'tool.call.failed'
  | 'tool.call.cancelled'
  | 'run.step.started'
  | 'run.step.completed'
  | 'run.step.failed'
  | 'agent.step.planned'
  | 'agent.step.started'
  | 'agent.step.completed'
  | 'agent.step.failed'
  | 'artifact.created'
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
  /** 联网形状由人在连接上声明；两个 supported 标志是后端从形状派生出来的只读结论。 */
  webSearchDialect?: string
  webSearchSupported?: boolean
  forcedSearchSupported?: boolean
  inputPricePerMillion?: number | null
  outputPricePerMillion?: number | null
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
  /** 省略即 NONE：未声明联网形状的请求永远不带检索参数。 */
  webSearchDialect?: string
  /** 可选单价（每百万 token）。留空即不计价，用量页会如实显示「未计价」而不是 0。 */
  inputPricePerMillion?: number | null
  outputPricePerMillion?: number | null
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
  workspaceId?: number
  taskId: number
  taskTitle?: string
  sourceRunId?: number
  datasetId?: number | null
  datasetName?: string | null
  sheetId?: number | null
  sheetName?: string | null
  title: string
  artifactType: ArtifactType
  status?: string
  currentVersion: number
  currentVersionId?: number | null
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
  contentFormat?: string
}

export interface ArtifactUpdatePayload {
  title: string
  content: string
  expectedVersion: number
}

export type DatasetFormat = 'CSV' | 'XLSX'
export type DatasetStatus =
  | 'UPLOADED'
  | 'QUEUED'
  | 'PARSING'
  | 'READY'
  | 'FAILED'
  | 'DELETED'

export type DatasetColumnType =
  | 'EMPTY'
  | 'STRING'
  | 'INTEGER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'

export interface DatasetSummary {
  id: number
  workspaceId: number
  documentId: number
  name: string
  format: DatasetFormat
  status: DatasetStatus
  activeSheetId: number | null
  activeSheetName?: string | null
  rowCount: number | null
  columnCount: number | null
  sizeBytes?: number | null
  errorCode: string | null
  errorSummary: string | null
  createdAt: string
  updatedAt: string
}

export interface DatasetSheetSummary {
  id: number
  datasetId: number
  name: string
  sheetIndex?: number
  rowCount: number | null
  columnCount: number | null
  status?: DatasetStatus
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface DatasetDetail extends DatasetSummary {
  sheets: DatasetSheetSummary[]
}

export interface DatasetColumn {
  id: number
  datasetId?: number
  sheetId: number
  name: string
  ordinal?: number
  normalizedName?: string | null
  sourceName?: string | null
  inferredType: DatasetColumnType
  effectiveType: DatasetColumnType
  nullable?: boolean
  missingCount?: number | null
  distinctCount?: number | null
  minimum?: string | number | null
  maximum?: string | number | null
  sampleValues?: Array<string | number | boolean | null>
  version: number
  createdAt?: string
  updatedAt?: string
}

export type DatasetCellValue = string | number | boolean | null

export interface DatasetPreviewColumn {
  id?: number
  key: string
  name: string
  effectiveType?: DatasetColumnType
}

export interface DatasetPreview {
  columns: Array<DatasetPreviewColumn | string>
  rows: Array<Record<string, DatasetCellValue> | DatasetCellValue[]>
  offset: number
  limit: number
  hasMore: boolean
  totalRows?: number
}

export interface DatasetColumnProfile {
  columnId?: number
  name: string
  effectiveType?: DatasetColumnType
  missingCount?: number
  missingRate?: number
  distinctCount?: number
  minimum?: string | number | null
  maximum?: string | number | null
  average?: number | null
  topValues?: Array<{ value: DatasetCellValue; count: number }>
}

export interface DatasetProfile {
  datasetId?: number
  sheetId: number
  profileVersion?: number
  rowCount: number
  columnCount: number
  missingCellCount?: number
  duplicateRowCount?: number
  columns?: DatasetColumnProfile[]
  summary?: Record<string, unknown>
  quality?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

export interface DatasetUploadPayload {
  workspaceId: number
  name?: string
  file: File
}

export interface DatasetTypeOverridePayload {
  expectedVersion: number
  effectiveType: DatasetColumnType
}

export type AnalysisOutputType = 'ANALYSIS_REPORT' | 'CHART_SPEC'
export type DataAnalysisOutputType = AnalysisOutputType

export interface DataAnalysisSummary {
  datasetId: number
  datasetName?: string | null
  datasetStatus?: DatasetStatus | null
  sheetId: number
  sheetName?: string | null
  analysisGoal: string
  expectedOutputs: DataAnalysisOutputType[]
  columnOverrides?: Record<string, DatasetColumnType>
}

export interface DataAnalysisTaskPayload {
  workspaceId: number
  connectionId: number
  datasetId: number
  sheetId: number
  title: string
  analysisGoal: string
  expectedOutputs: DataAnalysisOutputType[]
  priority: Priority
  columnOverrides?: Record<string, DatasetColumnType>
}

export type DataAnalysisTaskUpdatePayload = Omit<DataAnalysisTaskPayload, 'workspaceId'>

export interface DataAnalysisTaskDetail extends TaskSummary {
  dataAnalysis: DataAnalysisSummary
}

export type AgentRunStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'WAITING_CONFIRMATION'
  | 'WAITING_APPROVAL'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SKIPPED'

export interface AgentRunStep {
  id: number
  runId: number
  stepNumber: number
  stepType: string
  title: string
  status: AgentRunStepStatus
  inputSummary?: string | null
  outputSummary?: string | null
  modelCallId?: number | null
  toolCallId?: number | null
  startedAt?: string | null
  finishedAt?: string | null
  durationMs?: number | null
  errorCode?: string | null
  errorSummary?: string | null
}

export type ToolCallStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'

export interface ToolCallSummary {
  id: number
  runId?: number
  workflowRunId?: number | null
  workflowNodeRunId?: number | null
  stepId?: number | null
  modelCallId?: number | null
  toolCode: string
  toolName?: string
  toolVersion?: string | number
  toolVersionId?: number | null
  status: ToolCallStatus
  argumentsSummary?: string | null
  argumentSummary?: string | null
  resultSummary?: string | null
  resultSizeBytes?: number | null
  durationMs?: number | null
  errorCode?: string | null
  errorSummary?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string
}

export interface ToolCallDetail extends ToolCallSummary {
  riskLevel?: string
}

export interface ToolDefinition {
  id: number
  toolCode: string
  name: string
  description?: string | null
  toolVersion?: number
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  riskLevel: string
  requiresConfirmation: boolean
  timeoutMs?: number
  maxResultBytes?: number
  enabled: boolean
  updatedAt?: string
}

export type CatalogStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED'

export interface ToolVersion {
  id: number
  toolCatalogId: number
  versionNumber: number
  status: CatalogStatus
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  riskLevel: string
  requiresConfirmation: boolean
  timeoutMs: number
  maxResultBytes: number
  capabilities: Record<string, unknown>
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ToolCatalog {
  id: number
  toolCode: string
  name: string
  description?: string | null
  handlerType: string
  publishedVersionId?: number | null
  status: CatalogStatus
  lockVersion: number
  versions: ToolVersion[]
  createdAt?: string
  updatedAt?: string
}

export type McpServerStatus = 'ENABLED' | 'DISABLED'
export type McpSyncStatus = 'NEVER' | 'SUCCESS' | 'FAILED'

export interface McpTool {
  id: number
  mcpServerId: number
  toolCode: string
  toolName: string
  title?: string | null
  description?: string | null
  toolCatalogId: number
  toolVersionId: number
  versionNumber: number
  enabled: boolean
  catalogStatus?: CatalogStatus | null
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  riskLevel?: string | null
  requiresConfirmation: boolean
  timeoutMs?: number | null
  maxResultBytes?: number | null
  updatedAt?: string
}

export interface McpServer {
  id: number
  workspaceId: number
  serverCode: string
  name: string
  transport: string
  endpointUrl: string
  hasCredentialRef: boolean
  allowPrivateNetwork: boolean
  status: McpServerStatus
  syncStatus: McpSyncStatus
  lastSyncAt?: string | null
  lastErrorCode?: string | null
  lastErrorSummary?: string | null
  lockVersion: number
  tools: McpTool[]
  createdAt?: string
  updatedAt?: string
}

export type MemoryStatus = 'CONFIRMED' | 'ARCHIVED' | 'DELETED'
export type MemoryCandidateStatus =
  | 'PROPOSED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'DELETED'

export interface Memory {
  id: number
  workspaceId: number
  memoryType: 'PREFERENCE' | 'FACT' | 'CONSTRAINT' | 'EXPERIENCE' | string
  content: Record<string, unknown>
  sourceType: 'USER' | 'TASK' | 'ARTIFACT' | 'AGENT_RUN' | 'WORKFLOW_RUN' | string
  sourceId?: number | null
  confidence: number
  expiresAt?: string | null
  status: MemoryStatus
  version: number
  createdAt?: string
  updatedAt?: string
}

export interface MemoryCandidate extends Omit<Memory, 'status'> {
  status: MemoryCandidateStatus
}

export type ContentProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
export type ContentVersionOperation =
  | 'OUTLINE'
  | 'DRAFT'
  | 'REWRITE'
  | 'EXPAND'
  | 'COMPRESS'
  | 'REVIEW'
export type ContentVersionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'PAUSED'
  | 'CANCELLED'

export interface ContentMaterial {
  id: number
  contentProjectId: number
  sourceType: 'DOCUMENT' | 'ARTIFACT' | string
  sourceId: number
  relationType: string
  sortOrder: number
  sourceTitle?: string | null
  createdAt?: string
}

export interface ContentVersion {
  id: number
  contentProjectId: number
  versionNumber: number
  operation: ContentVersionOperation | string
  status: ContentVersionStatus | string
  title: string
  contentFormat: 'MARKDOWN' | string
  content?: string | null
  requestKey?: string | null
  taskId?: number | null
  sourceRunId?: number | null
  artifactId?: number | null
  artifactVersionId?: number | null
  errorCode?: string | null
  errorSummary?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ContentProjectSummary {
  id: number
  workspaceId: number
  connectionId: number
  title: string
  topic: string
  outputFormat: string
  status: ContentProjectStatus | string
  version: number
  latestVersionNumber?: number | null
  latestVersionStatus?: ContentVersionStatus | string | null
  createdAt?: string
  updatedAt?: string
}

export interface ContentProject extends ContentProjectSummary {
  audience?: string | null
  style?: string | null
  materials: ContentMaterial[]
  versions: ContentVersion[]
}

export interface SkillVersion {
  id: number
  skillDefinitionId: number
  versionNumber: number
  status: CatalogStatus
  promptVersionId: number
  promptVersionNumber?: number | null
  inputSchema: Record<string, unknown>
  outputType: string
  runtimeLimits: Record<string, unknown>
  toolVersionIds: number[]
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Skill {
  id: number
  workspaceId: number
  skillCode: string
  name: string
  description?: string | null
  publishedVersionId?: number | null
  status: CatalogStatus
  lockVersion: number
  versions: SkillVersion[]
  createdAt?: string
  updatedAt?: string
}

export type ArtifactExportStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
export type ArtifactExportFormat = 'MARKDOWN' | 'JSON' | 'CSV'

export interface ArtifactExport {
  id: number
  artifactId: number
  artifactVersionId: number
  artifactVersion?: number
  artifactTitle?: string | null
  artifactType?: ArtifactType
  format: ArtifactExportFormat
  status: ArtifactExportStatus
  fileName?: string | null
  sizeBytes?: number | null
  contentHash?: string | null
  workspaceId?: number
  taskId?: number
  sourceRunId?: number | null
  datasetId?: number | null
  sheetId?: number | null
  errorCode?: string | null
  errorSummary?: string | null
  createdAt: string
  finishedAt?: string | null
  updatedAt?: string
}

export interface ArtifactExportPayload {
  artifactVersionId: number
  format: ArtifactExportFormat
}

export interface UsageSummary {
  callCount: number
  successCount: number
  failureCount: number
  inputTokens: number
  outputTokens: number
  averageLatencyMs: number
}

export interface UsageBreakdown {
  key?: string
  name?: string
  connectionId?: number
  connectionName?: string
  modelName?: string
  date?: string
  callCount: number
  successCount: number
  failureCount: number
  inputTokens: number
  outputTokens: number
  averageLatencyMs: number
}

export interface ModelUsageStatistics {
  summary: UsageSummary
  byConnection: UsageBreakdown[]
  byModel: UsageBreakdown[]
  byDay: UsageBreakdown[]
}

export type SearchResourceType = 'TASK' | 'DATASET' | 'DOCUMENT' | 'ARTIFACT' | 'RUN'

export interface SearchResultItem {
  resourceType: SearchResourceType
  resourceId: number
  title: string
  summary?: string | null
  updatedAt?: string | null
  route?: string | null
}

export interface SearchResponse {
  query?: string
  groups?: Partial<Record<SearchResourceType, SearchResultItem[]>>
  results?: SearchResultItem[]
}

export interface PromptVersionSummary {
  id: number
  templateId: number
  versionNumber: number
  purpose?: string | null
  contentSummary?: string | null
  variables?: string[]
  createdAt?: string
}

export interface AgentDefinitionSummary {
  id: number
  name: string
  description?: string | null
  status: string
  moduleType?: ModuleType
  version?: number
  promptTemplateId?: number | null
  promptVersionId?: number | null
  promptVersionNumber?: number | null
  defaultConnectionId?: number | null
  defaultModelProfileId?: number | null
  updatedAt?: string
}

export interface AgentDefinitionDetail extends AgentDefinitionSummary {
  configuration?: Record<string, unknown>
  prompt?: PromptVersionSummary | null
}

export type AgentVersionStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | string

export interface AgentVersion {
  id: number
  agentId: number
  versionNumber: number
  status: AgentVersionStatus
  connectionId: number | null
  modelProfileId: number | null
  connectionName?: string | null
  modelName?: string | null
  promptVersionId?: number | null
  promptVersionNumber?: number | null
  promptContent?: string | null
  promptVariables?: string[] | Record<string, unknown> | null
  configuration: Record<string, unknown>
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Agent {
  id: number
  workspaceId?: number | null
  code?: string | null
  name: string
  description?: string | null
  moduleType?: string | null
  status: string
  version?: number | null
  publishedVersionId?: number | null
  draftVersionId?: number | null
  connectionId?: number | null
  modelProfileId?: number | null
  promptVersionId?: number | null
  promptVersionNumber?: number | null
  promptContent?: string | null
  promptVariables?: string[] | Record<string, unknown> | null
  configuration: Record<string, unknown>
  draftVersion?: AgentVersion
  publishedVersion?: AgentVersion
  versions?: AgentVersion[]
  createdAt?: string
  updatedAt?: string
}

export interface AgentUpsertPayload {
  workspaceId: number
  code: string
  name: string
  description: string
  moduleType: string
  connectionId: number | null
  modelProfileId?: number | null
  promptContent: string
  promptVariables?: string[] | Record<string, unknown> | null
  configuration: Record<string, unknown>
  expectedVersion?: number
}

export interface AgentPublishResult {
  valid: boolean
  validationErrors: string[]
  validationWarnings: string[]
  agent?: Agent
}

export type WorkflowStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | 'ARCHIVED' | string
export type WorkflowVersionStatus = 'DRAFT' | 'PUBLISHED' | 'DISABLED' | string
export type WorkflowNodeType =
  | 'START'
  | 'AGENT'
  | 'TOOL'
  | 'APPROVAL'
  | 'CONDITION'
  | 'END'
  | string
export type WorkflowRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | string
export type WorkflowConditionOperator =
  | 'ALWAYS'
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'EXISTS'
  | 'NOT_EXISTS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | string

export interface WorkflowCondition {
  operator: WorkflowConditionOperator
  path?: string | null
  value?: string | number | boolean | null
}

export interface WorkflowNode {
  id?: number | null
  nodeKey: string
  nodeType: WorkflowNodeType
  name: string
  description?: string | null
  agentVersionId?: number | null
  configuration: Record<string, unknown>
  position?: Record<string, unknown> | null
  timeoutMs?: number | null
  maxRetries?: number | null
  riskLevel?: WorkflowRiskLevel | null
  requiresApproval?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowEdge {
  id?: number | null
  sourceNodeKey: string
  targetNodeKey: string
  branch: 'DEFAULT' | 'TRUE' | 'FALSE' | string
  priority?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowVersion {
  id: number
  workflowId: number
  versionNumber: number
  status: WorkflowVersionStatus
  configuration: Record<string, unknown>
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  publishedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Workflow {
  id: number
  workspaceId?: number | null
  code?: string | null
  name: string
  description?: string | null
  status: WorkflowStatus
  version?: number | null
  publishedVersionId?: number | null
  draftVersionId?: number | null
  configuration: Record<string, unknown>
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  draftVersion?: WorkflowVersion
  publishedVersion?: WorkflowVersion
  versions?: WorkflowVersion[]
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowUpsertPayload {
  workspaceId: number
  code: string
  name: string
  description: string
  configuration: Record<string, unknown>
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  expectedVersion?: number
}

export type WorkflowValidationSeverity = 'ERROR' | 'WARNING' | string

export interface WorkflowValidationIssue {
  code?: string
  severity: WorkflowValidationSeverity
  message: string
  nodeKey?: string | null
  edgeId?: number | null
  path?: string | null
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: WorkflowValidationIssue[]
  warnings: WorkflowValidationIssue[]
  nodeCount?: number | null
  edgeCount?: number | null
}

export interface WorkflowPublishResult extends WorkflowValidationResult {
  workflow?: Workflow
}

export interface WorkflowRunSummary {
  id: number
  workflowId?: number | null
  workflowVersionId?: number | null
  workflowName?: string | null
  status: RunStatus
  currentNodeKey?: string | null
  currentNodeName?: string | null
  waitingReason?: string | null
  retryCount?: number | null
  traceId?: string | null
  inputSummary?: string | null
  outputSummary?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  createdAt?: string
  updatedAt?: string
  errorCode?: string | null
  errorSummary?: string | null
}

export interface WorkflowNodeRun {
  id: number
  runId: number
  nodeKey: string
  nodeName?: string | null
  nodeType?: WorkflowNodeType | null
  status: AgentRunStepStatus
  retryCount?: number | null
  inputSummary?: string | null
  outputSummary?: string | null
  waitingReason?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  durationMs?: number | null
  errorCode?: string | null
  errorSummary?: string | null
}

export interface WorkflowRunDetail extends WorkflowRunSummary {
  workflowId: number | null
  workflowVersionId: number | null
  nodeRuns: WorkflowNodeRun[]
  lastSequence?: number | null
}

export interface WorkflowRunCreatePayload {
  versionId?: number | null
  input?: Record<string, unknown>
}

export interface WorkflowRunCommandResponse {
  runId: number
  status: RunStatus
  command: 'CANCEL'
  successorRunId?: number | null
}

export type ResumeSectionKey =
  | 'BASIC_INFO'
  | 'EDUCATION'
  | 'WORK_EXPERIENCE'
  | 'PROJECT_EXPERIENCE'
  | 'SKILLS'
  | string
export type ResumeItemKind = 'FIELD' | 'ENTRY' | string
export type ResumeSourceType = 'MANUAL' | 'JOB_PROFILE' | 'PROJECT_VERSION' | 'PROJECT_FACT' | string
export type ResumeVersionStatus = 'DRAFT' | 'FINAL' | string
export type ResumeExportStatus = 'SUCCEEDED' | 'FAILED' | string

export interface ResumeItemSource {
  type: ResumeSourceType
  refId: number | null
  label: string | null
  projectId?: number | null
  projectVersionId?: number | null
}

/** 响应侧 `ItemResponse` 把来源字段摊平，只有请求体才用嵌套 `source`。 */
export interface ResumeItem {
  id: string
  order: number
  kind: ResumeItemKind
  label: string | null
  text: string
  sourceType: ResumeSourceType
  sourceRefId: number | null
  sourceLabel: string | null
  sourceProjectId?: number | null
  sourceProjectVersionId?: number | null
  edited: boolean
}

export interface ResumeSection {
  key: ResumeSectionKey
  items: ResumeItem[]
}

export interface ResumeItemPayload {
  id: string
  order: number
  kind: ResumeItemKind
  label: string | null
  text: string
  source: ResumeItemSource
  edited: boolean
}

export interface ResumeSectionPayload {
  key: ResumeSectionKey
  items: ResumeItemPayload[]
}

export interface ResumeExportRecord {
  id: number
  status: ResumeExportStatus
  sizeBytes: number | null
  fontName: string | null
  failureReason: string | null
  createdAt: string
}

export interface ResumeVersionSummary {
  id: number
  versionNumber: number
  status: ResumeVersionStatus
  changeSummary: string | null
  sectionCount: number
  itemCount: number
  totalChars: number
  pdfAvailable: boolean
  pdfGeneratedAt: string | null
  exportCount: number
  lastExportedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ResumeVersionDetail {
  id: number
  versionNumber: number
  status: ResumeVersionStatus
  changeSummary: string | null
  sections: ResumeSection[]
  exports: ResumeExportRecord[]
  pdfGeneratedAt: string | null
  sourceSnapshotAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ResumeState {
  exists: boolean
  resumeId: number | null
  title: string | null
  activeVersionId: number | null
  activeVersion: ResumeVersionSummary | null
  draft: ResumeVersionDetail | null
  versions: ResumeVersionSummary[]
}

export interface ResumePreflight {
  ready: boolean
  blockers: string[]
  totalChars: number
  itemCount: number
}

export interface ResumeDraftPayload {
  sections: ResumeSectionPayload[]
  expectedUpdatedAt?: string | null
  title?: string | null
  changeSummary?: string | null
}

/** 报告中心（C-02）。后端全局 `non_null`：可空字段是整键缺失，因此一律声明为可选。 */
export interface ReportListItem {
  reportId: number
  sessionId: number
  sessionTitle: string
  topicMode: string | null
  form: string | null
  round: string | null
  targetRole?: string | null
  targetExperienceBand?: string | null
  interviewerId?: number | null
  interviewerName?: string | null
  sessionStatus: string | null
  reportStatus: string
  totalScore?: number | null
  dimensionCount: number
  dimensionAverage?: number | null
  hiringRecommendation?: string | null
  /** 缺失 = 该报告生成时还没有规则版本承载（V30 之前），不得参与趋势与比较。 */
  scoringRuleVersion?: string | null
  failureReason?: string | null
  retryCount: number
  generatedAt?: string | null
  scheduledAt?: string | null
  createdAt: string
}

export interface ReportListResponse {
  items: ReportListItem[]
  total: number
  page: number
  size: number
}

export interface ReportListQuery {
  days?: number | null
  topicMode?: string | null
  form?: string | null
  recommendation?: string | null
  interviewerId?: number | null
  page?: number | null
  size?: number | null
}

export interface ReportDimensionAverage {
  name: string
  sampleCount: number
  average: number
}

export interface ReportRuleVersionSample {
  ruleVersion: string
  sampleCount: number
}

export interface ReportScorePoint {
  reportId: number
  generatedAt: string
  totalScore: number
}

export interface ReportSummary {
  minTrendSamples: number
  /** 缺失 = 一条带规则版本的报告都没有，趋势无对象可算。 */
  ruleVersion?: string | null
  sampleCount: number
  renderable: boolean
  dimensions: ReportDimensionAverage[]
  scoreSeries: ReportScorePoint[]
  versions: ReportRuleVersionSample[]
}

export interface ReportAnswerSource {
  answerSource: string
  count: number
}

export interface ReportDetail {
  report: ReportListItem
  dimensionScores: Record<string, number>
  strengths: string[]
  weaknesses: string[]
  followUpFindings: string[]
  projectMastery: string[]
  knowledgeGaps: string[]
  studySuggestions: string[]
  answerSources: ReportAnswerSource[]
  aiModelSnapshot?: string | null
}

/** 错题本 / 专项复练（C-03）。同样受后端全局 `non_null` 影响：可空字段整键缺失。 */
export type PracticeSource = 'REPORT' | 'INTERVIEW_TURN' | 'MANUAL'
export type PracticeMastery = 'NEW' | 'LEARNING' | 'MASTERED'
export type PracticeResult = 'RETRY' | 'PARTIAL' | 'PASSED'

export interface PracticeAttempt {
  id: number
  answer: string
  result: PracticeResult
  selfScore?: number | null
  feedback?: string | null
  attemptedAt: string
}

export interface PracticeItem {
  itemId: number
  sourceType: PracticeSource
  sourceId: number
  topic: string
  question: string
  /** 只有用户自己粘贴过才有值，系统永不自动生成。 */
  referenceAnswer?: string | null
  masteryStatus: PracticeMastery
  nextReviewDate?: string | null
  reviewDateSource?: 'MANUAL' | 'RULE' | null
  archived: boolean
  createdAt: string
  updatedAt: string
  attemptCount: number
  lastAttemptAt?: string | null
  lastResult?: PracticeResult | null
  lastSelfScore?: number | null
  consecutivePassed: number
  sourceSessionId?: number | null
  sourceSessionTitle?: string | null
  sourceTopicMode?: string | null
  sourceForm?: string | null
  reportTotalScore?: number | null
  reportScoringRuleVersion?: string | null
  originalQuestion?: string | null
  originalAnswer?: string | null
  originalAnswerSource?: string | null
  originalTurnType?: string | null
  traceableToQuestion: boolean
  /** 追不到原始问题时后端给出的说明文本；能追到时该键缺失。 */
  traceLimitation?: string | null
}

export interface PracticeListResponse {
  items: PracticeItem[]
  total: number
  page: number
  size: number
}

export interface PracticeDetailResponse {
  item: PracticeItem
  attempts: PracticeAttempt[]
}

export interface PracticeTopicCount {
  topic: string
  itemCount: number
  notMasteredCount: number
}

export interface PracticeSummary {
  total: number
  newCount: number
  learningCount: number
  masteredCount: number
  renderable: boolean
  topics: PracticeTopicCount[]
  lastAttemptAt?: string | null
  /** 掌握判定阈值由后端下发，界面只复述不自己写死。 */
  masteredStreak: number
  masteredSelfScore: number
  /** 复习日阶梯（天）：连续答通第 n 次取第 n 档，没答通回落到第一档。同样由后端下发。 */
  reviewLadderDays: number[]
}

export interface PracticeImportResponse {
  sessionId: number
  sessionTitle?: string | null
  reportId?: number | null
  created: number
  skipped: number
  topics: string[]
  note?: string | null
}

/** `archived` 是三态：不传=只看未归档，`true`=只看已归档，`all`=两类都要。 */
export interface PracticeListQuery {
  mastery?: PracticeMastery | null
  sourceType?: PracticeSource | null
  topic?: string | null
  archived?: 'true' | 'false' | 'all' | null
  page?: number
  size?: number
}

/**
 * 技能图谱（C-04）线上契约，口径见 `16_技能图谱与能力记录设计.md` §8。
 * 后端全局 `non_null`：可空字段是**整个键缺失**，因此这里全部声明为可选。
 */
export interface CapabilityDimensionView {
  name: string
  category: string
  /** 缺该维度的观测时后端不下发 score 键；界面显示「本期无观测」而不是 0 分。 */
  score?: number | null
  sampleCount: number
}

export interface CapabilityScorePoint {
  reportId: number
  sessionId: number
  generatedAt: string
  totalScore: number
}

export interface CapabilityRuleVersion {
  ruleVersion: string
  sampleCount: number
}

/** 自评层只有两个四档序数字段，后端不做 0-100 折算（`16` §6.2）。 */
export interface CapabilitySelfAssessment {
  javaSkillLevel?: string | null
  aiSkillLevel?: string | null
  updatedAt?: string | null
}

export interface CapabilitySources {
  reportSamples: number
  unversionedReports: number
  practiceItems: number
  masteredPracticeItems: number
  confirmedProjectFacts: number
}

export interface CapabilityOverview {
  rangeDays?: number | null
  ruleVersion?: string | null
  maxScore: number
  sampleCount: number
  minTrendSamples: number
  renderable: boolean
  reason?: string | null
  dimensions: CapabilityDimensionView[]
  series: CapabilityScorePoint[]
  selfAssessment?: CapabilitySelfAssessment | null
  sources: CapabilitySources
  versions: CapabilityRuleVersion[]
}

export interface CapabilityEvidenceItem {
  reportId: number
  sessionId: number
  generatedAt: string
  score: number
}

export interface CapabilityEvidence {
  name: string
  category: string
  rangeDays?: number | null
  ruleVersion?: string | null
  sampleCount: number
  items: CapabilityEvidenceItem[]
}

/* ---------------------------------------------------------------------------
 * 岗位与 JD 匹配（C-05，契约见 17_岗位与JD匹配设计.md §8）
 * 后端全局 non_null 序列化 ⇒ 可空字段是「键缺失」，因此这里一律声明为可选。
 * 四个匹配分数键在响应里根本不存在（本期不评分），所以不写进类型：写了就是暗示将来会有。
 * ------------------------------------------------------------------------- */

export type JobRequirementCategory = 'SKILL' | 'EXPERIENCE' | 'PROJECT' | 'OTHER'
export type JobMatchVerdict = 'MATCHED' | 'GAP' | 'NEED_CONFIRMATION'
export type JobMatchConfirmation = 'PENDING' | 'CONFIRMED' | 'REJECTED'

/** 关联的投递记录摘要；投递被删后外键置 NULL，该字段整体缺失（ADR-0011）。 */
export interface JobApplicationRef {
  id: number
  company?: string | null
  role?: string | null
  stage?: string | null
}

export interface JobRequirement {
  id: string
  category: JobRequirementCategory
  categoryLabel: string
  text: string
}

export interface JobRequirementPayload {
  id: string
  category: JobRequirementCategory
  text: string
}

export interface JobPostingVersion {
  id: number
  versionNumber: number
  ruleVersion: string
  requirementCount: number
  jdChars: number
  active: boolean
  createdAt: string
}

export interface JobPostingSummary {
  id: number
  company: string
  title: string
  city?: string | null
  salaryNote?: string | null
  source?: string | null
  archived: boolean
  updatedAt: string
  activeVersionId?: number | null
  activeVersionNumber?: number | null
  requirementCount: number
  application?: JobApplicationRef | null
  lastMatchedAt?: string | null
  lastMatchConfirmationStatus?: JobMatchConfirmation | null
}

export interface JobPostingListResponse {
  items: JobPostingSummary[]
  total: number
  page: number
  size: number
  /** 上限由后端下发，界面不写死数字（与 minTrendSamples/masteredStreak 同一条约定）。 */
  maxRequirementCount: number
  maxJdChars: number
}

export interface JobScoring {
  enabled: boolean
  reason?: string | null
}

export interface JobPostingDetail {
  id: number
  company: string
  title: string
  city?: string | null
  salaryNote?: string | null
  source?: string | null
  archived: boolean
  createdAt: string
  updatedAt: string
  application?: JobApplicationRef | null
  activeVersionId?: number | null
  jdText?: string | null
  requirements: JobRequirement[]
  ruleVersion?: string | null
  versions: JobPostingVersion[]
  scoring: JobScoring
  scoringNote?: string | null
}

export interface JobMatchEvidence {
  sectionKey: string
  sectionLabel: string
  itemId?: string | null
  itemLabel?: string | null
  snippet?: string | null
}

export interface JobMatchItem {
  requirementId: string
  category: JobRequirementCategory
  categoryLabel: string
  text: string
  verdict: JobMatchVerdict
  verdictLabel: string
  reason?: string | null
  /** 最多返回 3 条；总数在 evidenceCount，界面要按「共 N 处，这里显示前 M 处」表述。 */
  evidences: JobMatchEvidence[]
  evidenceCount: number
}

export interface JobMatchCounts {
  total: number
  matched: number
  gaps: number
  needConfirmation: number
}

export interface JobMatchResumeRef {
  versionId?: number | null
  versionNumber?: number | null
  status?: string | null
}

export interface JobMatchView {
  /** 实时对照时缺失；保存后为持久化行的主键。 */
  matchId?: number | null
  jobId: number
  company: string
  title: string
  jdVersionId: number
  jdVersionNumber: number
  ruleVersion: string
  resume?: JobMatchResumeRef | null
  /** REQUESTED / ACTIVE / DRAFT / SAVED；缺失表示没有可比对的简历。 */
  resumeSource?: string | null
  profileSnapshotAt?: string | null
  counts: JobMatchCounts
  scoring: JobScoring
  confirmationStatus?: JobMatchConfirmation | null
  confirmedAt?: string | null
  savedAt?: string | null
  items: JobMatchItem[]
}

export interface JobMatchHistoryItem {
  matchId: number
  jdVersionNumber: number
  resume?: JobMatchResumeRef | null
  ruleVersion: string
  counts: JobMatchCounts
  confirmationStatus?: JobMatchConfirmation | null
  confirmedAt?: string | null
  createdAt: string
}

export interface JobMatchListResponse {
  items: JobMatchHistoryItem[]
  total: number
  page: number
  size: number
}

export interface JobPostingCreatePayload {
  company: string
  title: string
  city?: string | null
  salaryNote?: string | null
  source?: string | null
  applicationId?: number | null
  jdText: string
  requirements: JobRequirementPayload[]
}

export interface JobJdVersionPayload {
  jdText: string
  requirements: JobRequirementPayload[]
}

export interface JobMetaPayload {
  company: string
  title: string
  city?: string | null
  salaryNote?: string | null
  source?: string | null
  applicationId?: number | null
  expectedUpdatedAt: string
}

export interface UserPreferences {
  userId: number
  notifyReportReady: boolean
  notifyStudyDue: boolean
  notifyInterview: boolean
  notifyImportFailure: boolean
  notifyAiFailure: boolean
  timezoneId: string
  version: number
  createdAt: string
  updatedAt: string
}
