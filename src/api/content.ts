import { http } from './http'

import type {
  ContentMaterial,
  ContentProject,
  ContentProjectSummary,
  ContentVersion,
  PageResult,
} from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

export interface ContentProjectPayload {
  workspaceId: number
  connectionId: number
  title: string
  topic: string
  audience?: string | null
  style?: string | null
  outputFormat: 'MARKDOWN'
  expectedVersion?: number
}

export interface ContentMaterialPayload {
  sourceType: 'DOCUMENT' | 'ARTIFACT'
  sourceId: number
  relationType?: string
}

export interface ContentOperationPayload {
  operation: ContentVersion['operation']
  instruction?: string | null
  sourceVersionId?: number | null
}

export async function listContentProjects(
  workspaceId?: number,
  page = 1,
  size = 20,
): Promise<PageResult<ContentProjectSummary>> {
  const { data } = await http.get<PageResult<ContentProjectSummary>>('/content-projects', {
    params: { workspaceId, page, size },
  })
  return data
}

export async function getContentProject(id: number): Promise<ContentProject> {
  const { data } = await http.get<ContentProject>(`/content-projects/${id}`)
  return data
}

export async function createContentProject(
  payload: ContentProjectPayload,
): Promise<ContentProject> {
  const { data } = await http.post<ContentProject>('/content-projects', payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey('content-project-create') },
  })
  return data
}

export async function updateContentProject(
  id: number,
  payload: ContentProjectPayload,
): Promise<ContentProject> {
  const { data } = await http.put<ContentProject>(`/content-projects/${id}`, payload)
  return data
}

export async function addContentMaterial(
  id: number,
  payload: ContentMaterialPayload,
): Promise<ContentProject> {
  const { data } = await http.post<ContentProject>(
    `/content-projects/${id}/materials`,
    payload,
  )
  return data
}

export async function removeContentMaterial(
  id: number,
  materialId: number,
): Promise<ContentProject> {
  const { data } = await http.delete<ContentProject>(
    `/content-projects/${id}/materials/${materialId}`,
  )
  return data
}

export async function generateContentVersion(
  id: number,
  payload: ContentOperationPayload,
  idempotencyKey = createIdempotencyKey('content-generate'),
): Promise<ContentVersion> {
  const { data } = await http.post<ContentVersion>(
    `/content-projects/${id}/generate`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}

export async function reviewContentVersion(
  id: number,
  payload: ContentOperationPayload,
  idempotencyKey = createIdempotencyKey('content-review'),
): Promise<ContentVersion> {
  const { data } = await http.post<ContentVersion>(
    `/content-projects/${id}/review`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}

export async function listContentVersions(id: number): Promise<ContentVersion[]> {
  const { data } = await http.get<ContentVersion[]>(`/content-projects/${id}/versions`)
  return data
}

export async function getContentVersion(
  id: number,
  versionId: number,
): Promise<ContentVersion> {
  const { data } = await http.get<ContentVersion>(
    `/content-projects/${id}/versions/${versionId}`,
  )
  return data
}

export type { ContentMaterial }
