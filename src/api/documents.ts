import { http, type RequestConfig } from './http'

import type { DocumentDetail, DocumentSummary, PageResult } from '@/types/api'

export async function listDocuments(
  page = 1,
  size = 20,
  workspaceId?: number,
): Promise<PageResult<DocumentSummary>> {
  const { data } = await http.get<PageResult<DocumentSummary>>('/documents', {
    params: { page, size, workspaceId },
  })
  return data
}

export async function uploadDocument(
  file: File,
  workspaceId: number,
  config?: RequestConfig,
): Promise<DocumentSummary> {
  const form = new FormData()
  form.append('file', file)
  form.append('workspaceId', String(workspaceId))
  const { data } = await http.post<DocumentSummary>('/documents', form, config)
  return data
}

export async function getDocument(id: number): Promise<DocumentDetail> {
  const { data } = await http.get<DocumentDetail>(`/documents/${id}`)
  return data
}

export async function getDocumentContent(id: number): Promise<string> {
  const { data } = await http.get<string>(`/documents/${id}/content`, {
    headers: { Accept: 'text/plain' },
    transformResponse: [(value) => value],
  })
  return data
}

export async function deleteDocument(id: number): Promise<void> {
  await http.delete(`/documents/${id}`)
}
