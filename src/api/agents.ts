import { http } from './http'

import type {
  Agent,
  AgentPublishResult,
  AgentUpsertPayload,
  AgentVersion,
  AgentVersionStatus,
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
  const items = read<unknown>(record, 'items', 'content', 'data', 'agents', 'versions')
  return Array.isArray(items) ? items as T[] : []
}

function normalizeVersion(value: unknown): AgentVersion {
  const raw = asRecord(value)
  const configuration = read<JsonRecord>(raw, 'configuration', 'config') || {}
  const prompt = read<JsonRecord>(raw, 'prompt')
  return {
    id: Number(read<number | string>(raw, 'id', 'versionId') || 0),
    agentId: Number(read<number | string>(raw, 'agentId', 'agentDefinitionId') || 0),
    versionNumber: Number(read<number | string>(raw, 'versionNumber', 'version') || 0),
    status: (read<AgentVersionStatus>(raw, 'status') || 'DRAFT') as AgentVersionStatus,
    connectionId: read<number | null>(raw, 'connectionId', 'defaultConnectionId') ?? null,
    modelProfileId: read<number | null>(raw, 'modelProfileId', 'defaultModelProfileId') ?? null,
    connectionName: read<string | null>(raw, 'connectionName') ?? null,
    modelName: read<string | null>(raw, 'modelName') ?? null,
    promptVersionId: read<number | null>(raw, 'promptVersionId') ?? null,
    promptVersionNumber: read<number | null>(raw, 'promptVersionNumber') ?? null,
    promptContent: read<string | null>(raw, 'promptContent') ??
      (typeof prompt?.content === 'string' ? prompt.content : null),
    promptVariables: read<string[] | JsonRecord | null>(
      raw,
      'promptVariables',
      'variables',
    ) ?? null,
    configuration,
    publishedAt: read<string | null>(raw, 'publishedAt') ?? null,
    createdAt: read<string | null>(raw, 'createdAt') ?? undefined,
    updatedAt: read<string | null>(raw, 'updatedAt') ?? undefined,
  }
}

function normalizeAgent(value: unknown): Agent {
  const raw = asRecord(value)
  const versions = readItems<unknown>(read<unknown>(raw, 'versions', 'agentVersions'))
    .map(normalizeVersion)
  const draft = read<unknown>(raw, 'draftVersion', 'currentDraftVersion') ||
    versions.find((version) => version.status === 'DRAFT')
  const published = read<unknown>(raw, 'publishedVersion', 'currentPublishedVersion') ||
    versions.find((version) => version.status === 'PUBLISHED')
  const draftVersion = draft ? normalizeVersion(draft) : undefined
  const publishedVersion = published ? normalizeVersion(published) : undefined
  const activeVersion = draftVersion || publishedVersion
  const configuration = read<JsonRecord>(raw, 'configuration', 'config') ||
    activeVersion?.configuration || {}
  const moduleType = read<string | null>(raw, 'moduleType') ??
    (typeof configuration.moduleType === 'string' ? configuration.moduleType : null)
  return {
    id: Number(read<number | string>(raw, 'id', 'agentId', 'agentDefinitionId') || 0),
    workspaceId: read<number | null>(raw, 'workspaceId') ?? null,
    code: read<string | null>(raw, 'code') ?? null,
    name: read<string>(raw, 'name') || '',
    description: read<string | null>(raw, 'description') ?? null,
    moduleType,
    status: read<string>(raw, 'status') || 'DRAFT',
    version: read<number | null>(raw, 'version') ?? null,
    publishedVersionId: read<number | null>(
      raw,
      'publishedVersionId',
      'publishedAgentVersionId',
    ) ?? null,
    draftVersionId: read<number | null>(raw, 'draftVersionId', 'currentDraftVersionId') ?? null,
    connectionId: read<number | null>(raw, 'connectionId', 'defaultConnectionId') ??
      activeVersion?.connectionId ?? null,
    modelProfileId: read<number | null>(raw, 'modelProfileId', 'defaultModelProfileId') ??
      activeVersion?.modelProfileId ?? null,
    promptVersionId: read<number | null>(raw, 'promptVersionId') ??
      activeVersion?.promptVersionId ?? null,
    promptVersionNumber: read<number | null>(raw, 'promptVersionNumber') ??
      activeVersion?.promptVersionNumber ?? null,
    promptContent: read<string | null>(raw, 'promptContent') ??
      activeVersion?.promptContent ?? null,
    promptVariables: read<string[] | JsonRecord | null>(
      raw,
      'promptVariables',
      'variables',
    ) ?? activeVersion?.promptVariables ?? null,
    configuration,
    draftVersion,
    publishedVersion,
    versions,
    createdAt: read<string | null>(raw, 'createdAt') ?? undefined,
    updatedAt: read<string | null>(raw, 'updatedAt') ?? undefined,
  }
}

function writeConfig(payload: AgentUpsertPayload): AgentUpsertPayload {
  return {
    ...payload,
    configuration: payload.configuration || {},
  }
}

export async function listAgents(): Promise<Agent[]> {
  const { data } = await http.get<unknown>('/agents')
  return readItems<unknown>(data).map(normalizeAgent)
}

export async function getAgent(id: number): Promise<Agent> {
  const { data } = await http.get<unknown>(`/agents/${id}`)
  return normalizeAgent(data)
}

export async function createAgent(payload: AgentUpsertPayload): Promise<Agent> {
  const { data } = await http.post<unknown>('/agents', writeConfig(payload), {
    headers: { 'Idempotency-Key': createIdempotencyKey('agent-create') },
  })
  return normalizeAgent(data)
}

export async function updateAgent(
  id: number,
  payload: AgentUpsertPayload,
): Promise<Agent> {
  const { data } = await http.put<unknown>(`/agents/${id}`, writeConfig(payload), {
    headers: { 'Idempotency-Key': createIdempotencyKey(`agent-update-${id}`) },
  })
  return normalizeAgent(data)
}

export async function createAgentVersion(
  id: number,
  payload: AgentUpsertPayload,
): Promise<AgentVersion> {
  const { data } = await http.post<unknown>(
    `/agents/${id}/versions`,
    writeConfig(payload),
    { headers: { 'Idempotency-Key': createIdempotencyKey(`agent-version-${id}`) } },
  )
  const record = asRecord(data)
  return normalizeVersion(record.version || record.agentVersion || data)
}

export async function publishAgent(
  id: number,
  versionId?: number | null,
): Promise<AgentPublishResult> {
  const { data } = await http.post<unknown>(
    `/agents/${id}/publish`,
    versionId ? { versionId } : {},
    { headers: { 'Idempotency-Key': createIdempotencyKey(`agent-publish-${id}`) } },
  )
  const record = asRecord(data)
  const validationErrors = read<string[]>(record, 'errors', 'validationErrors') || []
  const validationWarnings = read<string[]>(record, 'warnings', 'validationWarnings') || []
  const valid = read<boolean>(record, 'valid', 'publishable')
  return {
    valid: valid !== false && validationErrors.length === 0,
    validationErrors,
    validationWarnings,
    agent: record.agent ? normalizeAgent(record.agent) : normalizeAgent(data),
  }
}

export async function disableAgent(id: number): Promise<Agent> {
  const { data } = await http.post<unknown>(
    `/agents/${id}/disable`,
    {},
    { headers: { 'Idempotency-Key': createIdempotencyKey(`agent-disable-${id}`) } },
  )
  return normalizeAgent(data)
}
