import { http } from './http'

import type { ToolCatalog } from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

export interface ToolVersionPayload {
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  riskLevel: string
  requiresConfirmation: boolean
  timeoutMs: number
  maxResultBytes: number
  capabilities?: Record<string, unknown>
  expectedVersion?: number | null
}

export async function listTools(status?: string): Promise<ToolCatalog[]> {
  const { data } = await http.get<ToolCatalog[]>('/tools', {
    params: status ? { status } : undefined,
  })
  return data
}

export async function getTool(id: number): Promise<ToolCatalog> {
  const { data } = await http.get<ToolCatalog>(`/tools/${id}`)
  return data
}

export async function enableTool(id: number): Promise<ToolCatalog> {
  const { data } = await http.post<ToolCatalog>(`/tools/${id}/enable`, {})
  return data
}

export async function disableTool(id: number): Promise<ToolCatalog> {
  const { data } = await http.post<ToolCatalog>(`/tools/${id}/disable`, {})
  return data
}

export async function createToolVersion(
  id: number,
  payload: ToolVersionPayload,
): Promise<ToolCatalog> {
  const { data } = await http.post<ToolCatalog>(`/tools/${id}/versions`, payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`tool-version-${id}`) },
  })
  return data
}

export async function publishTool(
  id: number,
  versionId?: number | null,
  expectedVersion?: number | null,
): Promise<ToolCatalog> {
  const { data } = await http.post<ToolCatalog>(`/tools/${id}/publish`, {
    versionId,
    expectedVersion,
  }, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`tool-publish-${id}`) },
  })
  return data
}

export function draftToolVersion(tool: ToolCatalog) {
  return tool.versions.find((version) => version.status === 'DRAFT')
}
