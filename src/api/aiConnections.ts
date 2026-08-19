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
