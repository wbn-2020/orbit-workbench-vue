import { http } from './http'

import type {
  ArtifactDetail,
  ArtifactExport,
  ArtifactExportPayload,
  ArtifactSummary,
  ArtifactUpdatePayload,
  ArtifactVersion,
  ArtifactVersionSummary,
  PageResult,
} from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

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

export async function listArtifactExports(id: number): Promise<ArtifactExport[]> {
  const { data } = await http.get<ArtifactExport[]>(`/artifacts/${id}/exports`)
  return data
}

export async function createArtifactExport(
  id: number,
  payload: ArtifactExportPayload,
  idempotencyKey = createIdempotencyKey('artifact-export'),
): Promise<ArtifactExport> {
  const { data } = await http.post<ArtifactExport>(
    `/artifacts/${id}/exports`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  )
  return data
}

export async function downloadArtifactExport(
  exportId: number,
): Promise<{ blob: Blob; fileName?: string }> {
  const response = await http.get<Blob>(`/artifact-exports/${exportId}/content`, {
    responseType: 'blob',
  })
  const disposition = String(response.headers['content-disposition'] || '')
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  return {
    blob: response.data,
    fileName: encoded ? decodeURIComponent(encoded) : plain,
  }
}
