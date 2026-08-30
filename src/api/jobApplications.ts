import { http } from './http'

/* 求职投递记录 —— 对应后端 /job-applications */

export type ApplicationStage =
  | 'WATCHING' | 'APPLIED' | 'WRITTEN_TEST' | 'INTERVIEWING'
  | 'HR' | 'OFFER' | 'CLOSED'

export interface JobApplication {
  id: number
  company: string
  role: string
  jdSummary: string | null
  source: string | null
  applyDate: string | null
  interviewDate: string | null
  stage: ApplicationStage
  result: 'PENDING' | 'PASSED' | 'REJECTED' | 'WITHDRAWN' | null
  salaryNote: string | null
  contact: string | null
  note: string | null
  archived: boolean
  stageChangedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface StageCounts {
  watching: number
  applied: number
  writtenTest: number
  interviewing: number
  hr: number
  offer: number
  closed: number
}

export interface ApplicationList {
  items: JobApplication[]
  stages: StageCounts
}

export const APPLICATION_STAGES: { value: ApplicationStage; label: string }[] = [
  { value: 'WATCHING', label: '关注' },
  { value: 'APPLIED', label: '投递' },
  { value: 'WRITTEN_TEST', label: '笔试' },
  { value: 'INTERVIEWING', label: '面试' },
  { value: 'HR', label: 'HR' },
  { value: 'OFFER', label: 'Offer' },
  { value: 'CLOSED', label: '结束' },
]

export function stageLabel(stage: ApplicationStage): string {
  return APPLICATION_STAGES.find((item) => item.value === stage)?.label ?? stage
}

export interface ApplicationPayload {
  company: string
  role: string
  jdSummary?: string
  source?: string
  applyDate?: string | null
  interviewDate?: string | null
  stage: ApplicationStage
  salaryNote?: string
  contact?: string
  note?: string
}

export async function listApplications(includeArchived = false): Promise<ApplicationList> {
  const { data } = await http.get<ApplicationList>('/job-applications', {
    params: includeArchived ? { includeArchived: true } : {},
  })
  return data
}

export async function createApplication(payload: ApplicationPayload): Promise<JobApplication> {
  const { data } = await http.post<JobApplication>('/job-applications', payload)
  return data
}

export async function updateApplication(
  id: number,
  payload: Omit<ApplicationPayload, 'stage'>,
): Promise<JobApplication> {
  const { data } = await http.put<JobApplication>(`/job-applications/${id}`, payload)
  return data
}

export async function advanceStage(
  id: number,
  stage: ApplicationStage,
  detail?: string,
): Promise<JobApplication> {
  const { data } = await http.post<JobApplication>(`/job-applications/${id}/stage`, {
    stage,
    detail: detail || undefined,
  })
  return data
}

export const archiveApplication = (id: number) =>
  http.post<JobApplication>(`/job-applications/${id}/archive`)

export const unarchiveApplication = (id: number) =>
  http.post<JobApplication>(`/job-applications/${id}/unarchive`)

export async function deleteApplication(id: number): Promise<void> {
  await http.delete(`/job-applications/${id}`)
}
