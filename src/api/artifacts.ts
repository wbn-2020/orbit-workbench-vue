import { http } from './http'

import type {
  ArtifactDetail,
  ArtifactSummary,
  ArtifactUpdatePayload,
  ArtifactVersion,
  ArtifactVersionSummary,
  PageResult,
} from '@/types/api'

export async function listArtifacts(
  page = 1,
  size = 20,
  workspaceId?: number,
  taskId?: number,
): Promise<PageResult<ArtifactSummary>> {
  const { data } = await http.get<PageResult<ArtifactSummary>>('/artifacts', {
    params: { page, size, workspaceId, taskId },
  })
  return data
}

export async function getArtifact(id: number): Promise<ArtifactDetail> {
  const { data } = await http.get<ArtifactDetail>(`/artifacts/${id}`)
  return data
}

export async function listArtifactVersions(id: number): Promise<ArtifactVersionSummary[]> {
  const { data } = await http.get<ArtifactVersionSummary[]>(`/artifacts/${id}/versions`)
  return data
}

export async function getArtifactVersion(
  id: number,
  versionId: number,
): Promise<ArtifactVersion> {
  const { data } = await http.get<ArtifactVersion>(
    `/artifacts/${id}/versions/${versionId}`,
  )
  return data
}

export async function updateArtifact(
  id: number,
  payload: ArtifactUpdatePayload,
): Promise<ArtifactDetail> {
  const { data } = await http.put<ArtifactDetail>(`/artifacts/${id}`, payload)
  return data
}
