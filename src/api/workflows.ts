import { http } from './http'

import type {
  PageResult,
  RunEvent,
  RunEventType,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowPublishResult,
  WorkflowRunCommandResponse,
  WorkflowRunCreatePayload,
  WorkflowRunDetail,
  WorkflowRunSummary,
  WorkflowUpsertPayload,
  WorkflowValidationIssue,
  WorkflowValidationResult,
  WorkflowVersion,
  WorkflowVersionStatus,
} from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonRecord
    : {}
}

function read<T>(record: JsonRecord, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key] as T
  }
  return undefined
}

function readItems<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  const record = asRecord(value)
  const items = read<unknown>(
    record,
    'items',
    'content',
    'data',
    'workflows',
    'workflowDefinitions',
    'versions',
    'runs',
    'workflowRuns',
    'events',
  )
  return Array.isArray(items) ? items as T[] : []
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}

function asObject(value: unknown): JsonRecord {
  const record = asRecord(value)
  return { ...record }
}

function normalizeNode(value: unknown): WorkflowNode {
  const raw = asRecord(value)
  const configuration = asObject(read<unknown>(raw, 'configuration', 'config', 'configurationJson'))
  return {
    id: asNumber(read<unknown>(raw, 'id', 'nodeId')),
    nodeKey: read<string>(raw, 'nodeKey', 'key', 'code', 'name') || '',
    nodeType: read<string>(raw, 'nodeType', 'type') || 'AGENT',
    name: read<string>(raw, 'name', 'title', 'label') || '',
    description: read<string | null>(raw, 'description') ?? null,
    agentVersionId: asNumber(
      read<unknown>(raw, 'agentVersionId') ?? configuration.agentVersionId,
    ),
    configuration,
    position: asObject(read<unknown>(raw, 'position', 'positionJson')),
    timeoutMs: asNumber(read<unknown>(raw, 'timeoutMs', 'timeout')),
    maxRetries: asNumber(read<unknown>(raw, 'maxRetries', 'retryCount', 'retries')),
    riskLevel: read<string | null>(raw, 'riskLevel') ?? null,
    requiresApproval: Boolean(read<boolean>(raw, 'requiresApproval', 'approvalRequired')),
    createdAt: read<string | undefined>(raw, 'createdAt'),
    updatedAt: read<string | undefined>(raw, 'updatedAt'),
  }
}

function normalizeEdge(value: unknown): WorkflowEdge {
  const raw = asRecord(value)
  return {
    id: asNumber(read<unknown>(raw, 'id', 'edgeId')),
    sourceNodeKey: read<string>(raw, 'sourceNodeKey', 'source', 'from', 'fromNodeKey') || '',
    targetNodeKey: read<string>(raw, 'targetNodeKey', 'target', 'to', 'toNodeKey') || '',
    branch: read<string>(raw, 'branch', 'branchKey') || 'DEFAULT',
    priority: asNumber(read<unknown>(raw, 'priority', 'order')),
    createdAt: read<string | undefined>(raw, 'createdAt'),
    updatedAt: read<string | undefined>(raw, 'updatedAt'),
  }
}

function normalizeVersion(value: unknown): WorkflowVersion {
  const raw = asRecord(value)
  return {
    id: asNumber(read<unknown>(raw, 'id', 'versionId')) || 0,
    workflowId: asNumber(read<unknown>(raw, 'workflowId', 'workflowDefinitionId')) || 0,
    versionNumber: asNumber(read<unknown>(raw, 'versionNumber', 'version')) || 0,
    status: (read<WorkflowVersionStatus>(raw, 'status') || 'DRAFT') as WorkflowVersionStatus,
    configuration: asObject(read<unknown>(raw, 'configuration', 'config', 'metadata')),
    nodes: readItems<unknown>(read<unknown>(raw, 'nodes', 'workflowNodes')).map(normalizeNode),
    edges: readItems<unknown>(read<unknown>(raw, 'edges', 'workflowEdges')).map(normalizeEdge),
    publishedAt: read<string | null>(raw, 'publishedAt') ?? null,
    createdAt: read<string | undefined>(raw, 'createdAt'),
    updatedAt: read<string | undefined>(raw, 'updatedAt'),
  }
}

function normalizeWorkflow(value: unknown): Workflow {
  const raw = asRecord(value)
  const versions = readItems<unknown>(read<unknown>(raw, 'versions', 'workflowVersions'))
    .map(normalizeVersion)
  const draft = read<unknown>(raw, 'draftVersion', 'currentDraftVersion') ||
    versions.find((version) => version.status === 'DRAFT')
  const published = read<unknown>(raw, 'publishedVersion', 'currentPublishedVersion') ||
    versions.find((version) => version.status === 'PUBLISHED')
  const draftVersion = draft ? normalizeVersion(draft) : undefined
  const publishedVersion = published ? normalizeVersion(published) : undefined
  const activeVersion = draftVersion || publishedVersion
  const rawNodes = readItems<unknown>(read<unknown>(raw, 'nodes', 'workflowNodes'))
    .map(normalizeNode)
  const rawEdges = readItems<unknown>(read<unknown>(raw, 'edges', 'workflowEdges'))
    .map(normalizeEdge)
  const publishedVersionId = asNumber(read<unknown>(raw, 'publishedVersionId', 'publishedWorkflowVersionId')) ||
    publishedVersion?.id || null
  const draftVersionId = asNumber(read<unknown>(raw, 'draftVersionId', 'currentDraftVersionId')) ||
    draftVersion?.id || null
  const rawStatus = read<string>(raw, 'status') || 'DRAFT'
  const status = rawStatus === 'ACTIVE'
    ? (publishedVersionId ? 'PUBLISHED' : 'DRAFT')
    : rawStatus
  return {
    id: asNumber(read<unknown>(raw, 'id', 'workflowId', 'workflowDefinitionId')) || 0,
    workspaceId: asNumber(read<unknown>(raw, 'workspaceId')) ,
    code: read<string | null>(raw, 'code') ?? null,
    name: read<string>(raw, 'name', 'title') || '',
    description: read<string | null>(raw, 'description') ?? null,
    status,
    version: asNumber(read<unknown>(raw, 'version')),
    publishedVersionId,
    draftVersionId,
    configuration: Object.keys(asObject(read<unknown>(raw, 'configuration', 'config'))).length > 0
      ? asObject(read<unknown>(raw, 'configuration', 'config'))
      : activeVersion?.configuration || {},
    nodes: rawNodes.length > 0 ? rawNodes : activeVersion?.nodes || [],
    edges: rawEdges.length > 0 ? rawEdges : activeVersion?.edges || [],
    draftVersion,
    publishedVersion,
    versions,
    createdAt: read<string | undefined>(raw, 'createdAt'),
    updatedAt: read<string | undefined>(raw, 'updatedAt'),
  }
}

function normalizeIssue(value: unknown, severity: WorkflowValidationIssue['severity']): WorkflowValidationIssue {
  if (typeof value === 'string') return { severity, message: value }
  const raw = asRecord(value)
  return {
    code: read<string>(raw, 'code', 'errorCode'),
    severity: read<WorkflowValidationIssue['severity']>(raw, 'severity') || severity,
    message: read<string>(raw, 'message', 'detail', 'summary') || 'Workflow 校验未通过',
    nodeKey: read<string | null>(raw, 'nodeKey', 'nodeId') ?? null,
    edgeId: asNumber(read<unknown>(raw, 'edgeId')),
    path: read<string | null>(raw, 'path', 'field') ?? null,
  }
}

function normalizeValidation(value: unknown): WorkflowValidationResult {
  const raw = asRecord(value)
  const errors = readItems<unknown>(read<unknown>(raw, 'errors', 'validationErrors', 'issues'))
    .map((item) => normalizeIssue(item, 'ERROR'))
  const warnings = readItems<unknown>(read<unknown>(raw, 'warnings', 'validationWarnings'))
    .map((item) => normalizeIssue(item, 'WARNING'))
  const valid = read<boolean>(raw, 'valid', 'publishable')
  return {
    valid: valid !== false && errors.length === 0,
    errors,
    warnings,
    nodeCount: asNumber(read<unknown>(raw, 'nodeCount')),
    edgeCount: asNumber(read<unknown>(raw, 'edgeCount')),
  }
}

function normalizeRun(value: unknown): WorkflowRunSummary {
  const raw = asRecord(value)
  return {
    id: asNumber(read<unknown>(raw, 'id', 'runId')) || 0,
    workflowId: asNumber(read<unknown>(raw, 'workflowId', 'workflowDefinitionId')),
    workflowVersionId: asNumber(read<unknown>(raw, 'workflowVersionId', 'versionId')),
    workflowName: read<string | null>(raw, 'workflowName', 'name') ?? null,
    status: (read<string>(raw, 'status') || 'QUEUED') as WorkflowRunSummary['status'],
    currentNodeKey: read<string | null>(raw, 'currentNodeKey', 'currentNode') ?? null,
    currentNodeName: read<string | null>(raw, 'currentNodeName') ?? null,
    waitingReason: read<string | null>(raw, 'waitingReason', 'waitReason') ?? null,
    retryCount: asNumber(read<unknown>(raw, 'retryCount', 'retries')),
    traceId: read<string | null>(raw, 'traceId') ?? null,
    inputSummary: read<string | null>(raw, 'inputSummary') ?? null,
    outputSummary: read<string | null>(raw, 'outputSummary') ?? null,
    startedAt: read<string | null>(raw, 'startedAt') ?? null,
    finishedAt: read<string | null>(raw, 'finishedAt') ?? null,
    createdAt: read<string | undefined>(raw, 'createdAt'),
    updatedAt: read<string | undefined>(raw, 'updatedAt'),
    errorCode: read<string | null>(raw, 'errorCode') ?? null,
    errorSummary: read<string | null>(raw, 'errorSummary', 'errorMessage') ?? null,
  }
}

function normalizeNodeRun(value: unknown): WorkflowRunDetail['nodeRuns'][number] {
  const raw = asRecord(value)
  return {
    id: asNumber(read<unknown>(raw, 'id', 'nodeRunId')) || 0,
    runId: asNumber(read<unknown>(raw, 'runId', 'workflowRunId')) || 0,
    nodeKey: read<string>(raw, 'nodeKey', 'nodeId', 'key') || '',
    nodeName: read<string | null>(raw, 'nodeName', 'name') ?? null,
    nodeType: read<string | null>(raw, 'nodeType', 'type') ?? null,
    status: (read<string>(raw, 'status') || 'PENDING') as WorkflowRunDetail['nodeRuns'][number]['status'],
    retryCount: asNumber(read<unknown>(raw, 'retryCount', 'retries')),
    inputSummary: read<string | null>(raw, 'inputSummary') ?? null,
    outputSummary: read<string | null>(raw, 'outputSummary') ?? null,
    waitingReason: read<string | null>(raw, 'waitingReason') ?? null,
    startedAt: read<string | null>(raw, 'startedAt') ?? null,
    finishedAt: read<string | null>(raw, 'finishedAt') ?? null,
    durationMs: asNumber(read<unknown>(raw, 'durationMs')),
    errorCode: read<string | null>(raw, 'errorCode') ?? null,
    errorSummary: read<string | null>(raw, 'errorSummary', 'errorMessage') ?? null,
  }
}

function normalizeRunDetail(value: unknown): WorkflowRunDetail {
  const raw = asRecord(value)
  const summary = normalizeRun(value)
  return {
    ...summary,
    workflowId: summary.workflowId ?? null,
    workflowVersionId: summary.workflowVersionId ?? null,
    nodeRuns: readItems<unknown>(read<unknown>(raw, 'nodeRuns', 'nodes', 'workflowNodeRuns'))
      .map(normalizeNodeRun),
    lastSequence: asNumber(read<unknown>(raw, 'lastSequence', 'eventSequence', 'sequence')),
  }
}

function writeGraphPayload(payload: WorkflowUpsertPayload): {
  graph: {
    nodes: Array<Record<string, unknown>>
    edges: Array<Record<string, unknown>>
  }
  metadata: Record<string, unknown>
} {
  return {
    graph: {
      nodes: (payload.nodes || []).map((node) => ({
        key: node.nodeKey,
        type: node.nodeType,
        name: node.name,
        config: node.configuration || {},
        position: node.position || undefined,
      })),
      edges: (payload.edges || []).map((edge, index) => ({
        from: edge.sourceNodeKey,
        to: edge.targetNodeKey,
        branch: edge.branch || 'DEFAULT',
        order: edge.priority ?? index,
      })),
    },
    metadata: payload.configuration || {},
  }
}

function writeCreatePayload(payload: WorkflowUpsertPayload): Record<string, unknown> {
  const graphPayload = writeGraphPayload(payload)
  return {
    workspaceId: payload.workspaceId,
    code: payload.code,
    name: payload.name,
    description: payload.description,
    ...graphPayload,
  }
}

function writeUpdatePayload(payload: WorkflowUpsertPayload): Record<string, unknown> {
  const graphPayload = writeGraphPayload(payload)
  return {
    name: payload.name,
    description: payload.description,
    expectedVersion: payload.expectedVersion,
    ...graphPayload,
  }
}

function writeVersionPayload(payload: WorkflowUpsertPayload): Record<string, unknown> {
  return writeGraphPayload(payload)
}

function pageResult<T>(value: unknown, items: T[]): PageResult<T> {
  const raw = asRecord(value)
  return {
    items,
    page: asNumber(read<unknown>(raw, 'page', 'current')) || 1,
    size: asNumber(read<unknown>(raw, 'size', 'pageSize')) || items.length,
    total: asNumber(read<unknown>(raw, 'total', 'totalElements')) || items.length,
  }
}

export async function listWorkflows(params: {
  page?: number
  size?: number
  workspaceId?: number
  status?: string
} = {}): Promise<PageResult<Workflow>> {
  const { data } = await http.get<unknown>('/workflows', { params })
  return pageResult(data, readItems<unknown>(data).map(normalizeWorkflow))
}

export async function getWorkflow(id: number): Promise<Workflow> {
  const { data } = await http.get<unknown>(`/workflows/${id}`)
  return normalizeWorkflow(data)
}

export async function getWorkflowVersion(id: number, versionId: number): Promise<WorkflowVersion> {
  const { data } = await http.get<unknown>(`/workflows/${id}/versions/${versionId}`)
  return normalizeVersion(data)
}

export async function createWorkflow(payload: WorkflowUpsertPayload): Promise<Workflow> {
  const { data } = await http.post<unknown>('/workflows', writeCreatePayload(payload), {
    headers: { 'Idempotency-Key': createIdempotencyKey('workflow-create') },
  })
  return normalizeWorkflow(data)
}

export async function updateWorkflow(
  id: number,
  payload: WorkflowUpsertPayload,
): Promise<Workflow> {
  const { data } = await http.put<unknown>(`/workflows/${id}`, writeUpdatePayload(payload), {
    headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-update-${id}`) },
  })
  return normalizeWorkflow(data)
}

export async function validateWorkflow(
  id: number,
  payload?: WorkflowUpsertPayload,
): Promise<WorkflowValidationResult> {
  const { data } = await http.post<unknown>(
    `/workflows/${id}/validate`,
    payload ? writeVersionPayload(payload) : {},
  )
  return normalizeValidation(data)
}

export async function createWorkflowVersion(
  id: number,
  payload: WorkflowUpsertPayload,
): Promise<WorkflowVersion> {
  const { data } = await http.post<unknown>(
    `/workflows/${id}/versions`,
    writeVersionPayload(payload),
    { headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-version-${id}`) } },
  )
  const raw = asRecord(data)
  return normalizeVersion(raw.version || raw.workflowVersion || data)
}

export async function publishWorkflow(
  id: number,
  versionId?: number | null,
): Promise<WorkflowPublishResult> {
  const { data } = await http.post<unknown>(
    `/workflows/${id}/publish`,
    versionId ? { versionId } : {},
    { headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-publish-${id}`) } },
  )
  const raw = asRecord(data)
  return {
    valid: true,
    errors: [],
    warnings: [],
    workflow: normalizeWorkflow(raw.workflow || data),
  }
}

export async function disableWorkflow(id: number): Promise<Workflow> {
  const { data } = await http.post<unknown>(
    `/workflows/${id}/disable`,
    {},
    { headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-disable-${id}`) } },
  )
  return normalizeWorkflow(data)
}

export async function createWorkflowRun(
  id: number,
  payload: WorkflowRunCreatePayload = {},
): Promise<WorkflowRunSummary> {
  const { data } = await http.post<unknown>(
    `/workflows/${id}/runs`,
    payload,
    { headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-run-${id}`) } },
  )
  const raw = asRecord(data)
  return normalizeRun(raw.run || raw.workflowRun || data)
}

export async function listWorkflowRuns(
  id: number,
  page = 1,
  size = 20,
): Promise<PageResult<WorkflowRunSummary>> {
  const { data } = await http.get<unknown>(`/workflows/${id}/runs`, {
    params: { page, size },
  })
  return pageResult(data, readItems<unknown>(data).map(normalizeRun))
}

export async function getWorkflowRun(id: number): Promise<WorkflowRunDetail> {
  const [runResponse, nodeResponse] = await Promise.all([
    http.get<unknown>(`/workflow-runs/${id}`),
    http.get<unknown>(`/workflow-runs/${id}/nodes`),
  ])
  const detail = normalizeRunDetail(runResponse.data)
  return {
    ...detail,
    nodeRuns: readItems<unknown>(nodeResponse.data).map(normalizeNodeRun),
  }
}

async function workflowRunCommand(id: number): Promise<WorkflowRunCommandResponse> {
  const { data } = await http.post<unknown>(
    `/workflow-runs/${id}/cancel`,
    {},
    { headers: { 'Idempotency-Key': createIdempotencyKey(`workflow-run-cancel-${id}`) } },
  )
  const raw = asRecord(data)
  return {
    runId: asNumber(read<unknown>(raw, 'runId', 'id')) || id,
    status: (read<string>(raw, 'status') || 'QUEUED') as WorkflowRunCommandResponse['status'],
    command: 'CANCEL',
    successorRunId: asNumber(read<unknown>(raw, 'successorRunId')),
  }
}

export function cancelWorkflowRun(id: number): Promise<WorkflowRunCommandResponse> {
  return workflowRunCommand(id)
}

export async function listWorkflowRunEvents(id: number, afterSequence?: number): Promise<RunEvent[]> {
  const { data } = await http.get<unknown>(`/workflow-runs/${id}/events`, {
    params: afterSequence === undefined ? undefined : { afterSequence },
  })
  return readItems<unknown>(data).map((value) => {
    const raw = asRecord(value)
    return {
      id: asNumber(read<unknown>(raw, 'id', 'eventId')) ?? undefined,
      runId: asNumber(read<unknown>(raw, 'runId', 'workflowRunId')) || id,
      modelCallId: asNumber(read<unknown>(raw, 'modelCallId')),
      sequence: asNumber(read<unknown>(raw, 'sequence', 'seq')) || 0,
      type: (read<string>(raw, 'type', 'eventType') || 'message') as RunEventType,
      summary: read<string | null>(raw, 'summary', 'message') ?? null,
      data: asObject(read<unknown>(raw, 'data', 'payload')),
      text: read<string | undefined>(raw, 'text'),
      occurredAt: read<string | undefined>(raw, 'occurredAt', 'createdAt'),
    }
  })
}
