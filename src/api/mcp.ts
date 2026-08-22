import { http } from './http'

import type { McpServer, McpTool } from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

export interface McpServerPayload {
  workspaceId: number
  serverCode: string
  name: string
  transport: 'STREAMABLE_HTTP'
  endpointUrl: string
  credentialRef?: string | null
  allowPrivateNetwork: boolean
  expectedVersion?: number | null
}

export async function listMcpServers(workspaceId: number): Promise<McpServer[]> {
  const { data } = await http.get<McpServer[]>('/mcp/servers', { params: { workspaceId } })
  return data
}

export async function getMcpServer(id: number): Promise<McpServer> {
  const { data } = await http.get<McpServer>(`/mcp/servers/${id}`)
  return data
}

export async function createMcpServer(payload: McpServerPayload): Promise<McpServer> {
  const { data } = await http.post<McpServer>('/mcp/servers', payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey('mcp-server-create') },
  })
  return data
}

export async function updateMcpServer(
  id: number,
  payload: McpServerPayload,
): Promise<McpServer> {
  const { data } = await http.put<McpServer>(`/mcp/servers/${id}`, payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-server-update-${id}`) },
  })
  return data
}

export async function syncMcpServer(id: number): Promise<McpServer> {
  const { data } = await http.post<McpServer>(`/mcp/servers/${id}/sync`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-server-sync-${id}`) },
  })
  return data
}

export async function enableMcpServer(id: number): Promise<McpServer> {
  const { data } = await http.post<McpServer>(`/mcp/servers/${id}/enable`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-server-enable-${id}`) },
  })
  return data
}

export async function disableMcpServer(id: number): Promise<McpServer> {
  const { data } = await http.post<McpServer>(`/mcp/servers/${id}/disable`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-server-disable-${id}`) },
  })
  return data
}

export async function enableMcpTool(id: number): Promise<McpTool> {
  const { data } = await http.post<McpTool>(`/mcp/tools/${id}/enable`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-tool-enable-${id}`) },
  })
  return data
}

export async function disableMcpTool(id: number): Promise<McpTool> {
  const { data } = await http.post<McpTool>(`/mcp/tools/${id}/disable`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`mcp-tool-disable-${id}`) },
  })
  return data
}
