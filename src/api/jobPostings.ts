import { cleanParams, http } from './http'

import type {
  JobJdVersionPayload,
  JobMatchConfirmation,
  JobMatchListResponse,
  JobMatchView,
  JobMetaPayload,
  JobPostingCreatePayload,
  JobPostingDetail,
  JobPostingListResponse,
  JobRequirementCategory,
  JobMatchVerdict,
} from '@/types/api'

export interface JobPostingQuery {
  archived?: string | null
  q?: string | null
  page?: number | null
  size?: number | null
}

/**
 * 岗位与 JD 匹配接口（`17` §8）。列表的 `q` 只过滤用户自己录入的岗位，
 * 不是需求排除的「岗位搜索」，界面文案不得写成搜索岗位。
 */
export async function listJobPostings(query: JobPostingQuery = {}): Promise<JobPostingListResponse> {
  const { data } = await http.get<JobPostingListResponse>('/job-postings', {
    params: cleanParams(query),
  })
  return data
}

export async function getJobPosting(id: number): Promise<JobPostingDetail> {
  const { data } = await http.get<JobPostingDetail>(`/job-postings/${id}`)
  return data
}

export async function createJobPosting(payload: JobPostingCreatePayload): Promise<JobPostingDetail> {
  const { data } = await http.post<JobPostingDetail>('/job-postings', payload)
  return data
}

export async function updateJobMeta(id: number, payload: JobMetaPayload): Promise<JobPostingDetail> {
  const { data } = await http.put<JobPostingDetail>(`/job-postings/${id}/meta`, payload)
  return data
}

/** 改 JD 正文或改要求清单都会出新版本；两者都没变时后端返回 409 而不是攒一个空版本。 */
export async function saveJobJdVersion(
  id: number,
  payload: JobJdVersionPayload,
): Promise<JobPostingDetail> {
  const { data } = await http.put<JobPostingDetail>(`/job-postings/${id}/jd`, payload)
  return data
}

export async function setActiveJdVersion(id: number, versionId: number): Promise<JobPostingDetail> {
  const { data } = await http.post<JobPostingDetail>(`/job-postings/${id}/active-version`, {
    versionId,
  })
  return data
}

export async function setJobArchived(id: number, archived: boolean): Promise<JobPostingDetail> {
  const { data } = await http.post<JobPostingDetail>(`/job-postings/${id}/${archived ? 'archive' : 'unarchive'}`)
  return data
}

/** 实时对照，不落库。缺省用当前生效简历版本；没有可比对材料时后端不报错而是全栏给原因。 */
export async function matchJobPosting(id: number, resumeVersionId?: number | null): Promise<JobMatchView> {
  const { data } = await http.get<JobMatchView>(`/job-postings/${id}/match`, {
    params: cleanParams({ resumeVersionId }),
  })
  return data
}

/** 保存的是服务端重算后的快照，前端不回传判定结论。 */
export async function saveJobMatch(id: number, resumeVersionId?: number | null): Promise<JobMatchView> {
  const { data } = await http.post<JobMatchView>(`/job-postings/${id}/matches`, {
    resumeVersionId: resumeVersionId ?? null,
  })
  return data
}

export async function listJobMatches(id: number): Promise<JobMatchListResponse> {
  const { data } = await http.get<JobMatchListResponse>(`/job-postings/${id}/matches`)
  return data
}

export async function getJobMatch(matchId: number): Promise<JobMatchView> {
  const { data } = await http.get<JobMatchView>(`/matches/${matchId}`)
  return data
}

/** 确认是对既有行的状态更新，不新增行；expectedStatus 过期时 409 而不是静默覆盖。 */
export async function confirmJobMatch(
  matchId: number,
  status: JobMatchConfirmation,
  expectedStatus?: JobMatchConfirmation | null,
): Promise<JobMatchView> {
  const { data } = await http.post<JobMatchView>(`/matches/${matchId}/confirmation`, {
    status,
    expectedStatus: expectedStatus ?? null,
  })
  return data
}

export const REQUIREMENT_CATEGORY_LABELS: Record<JobRequirementCategory, string> = {
  SKILL: '技能',
  EXPERIENCE: '经验',
  PROJECT: '项目',
  OTHER: '其他',
}

export const REQUIREMENT_CATEGORIES: JobRequirementCategory[] = ['SKILL', 'EXPERIENCE', 'PROJECT', 'OTHER']

export const VERDICT_LABELS: Record<JobMatchVerdict, string> = {
  MATCHED: '已具备',
  GAP: '待补齐',
  NEED_CONFIRMATION: '需人工确认',
}

export const CONFIRMATION_LABELS: Record<JobMatchConfirmation, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
}

/** 对照用的是哪一版简历由后端说明，界面只负责翻译。 */
export const RESUME_SOURCE_LABELS: Record<string, string> = {
  REQUESTED: '你指定的版本',
  ACTIVE: '当前生效版本',
  DRAFT: '当前草稿',
  SAVED: '保存时用的版本',
}

export function resumeSourceLabel(source?: string | null): string {
  if (!source) return '没有可比对的简历'
  return RESUME_SOURCE_LABELS[source] ?? source
}

export function newRequirementId(): string {
  return `r-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`
}
