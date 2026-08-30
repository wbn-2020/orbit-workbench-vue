import { http, type RequestConfig } from './http'

import type { ProjectDetail, ProjectSummary } from '@/types/api'

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data } = await http.get<ProjectSummary[]>('/projects')
  return data
}

export async function getProject(id: number): Promise<ProjectDetail> {
  const { data } = await http.get<ProjectDetail>(`/projects/${id}`)
  return data
}

export async function createProject(
  name: string,
  workspaceId: number,
  file: File,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const form = new FormData()
  form.append('name', name)
  form.append('workspaceId', String(workspaceId))
  form.append('file', file)
  const { data } = await http.post<ProjectDetail>('/projects', form, config)
  return data
}

export async function createGitHubProject(
  name: string,
  workspaceId: number,
  repositoryUrl: string,
): Promise<ProjectDetail> {
  const { data } = await http.post<ProjectDetail>('/projects/imports/github', {
    name,
    workspaceId,
    repositoryUrl,
  })
  return data
}

export async function importProjectVersion(
  projectId: number,
  file: File,
  config?: RequestConfig,
): Promise<ProjectDetail> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await http.post<ProjectDetail>(
    `/projects/${projectId}/versions`,
    form,
    config,
  )
  return data
}

export async function importGitHubProjectVersion(
  projectId: number,
  repositoryUrl: string,
): Promise<ProjectDetail> {
  const { data } = await http.post<ProjectDetail>(`/projects/${projectId}/versions/github`, {
    repositoryUrl,
  })
  return data
}
