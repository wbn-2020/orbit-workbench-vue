import { http } from './http'

/* 面试官档案管理 —— 对应后端 /interviewers（内置模板只读，专属可编辑/归档/删除） */

export type InterviewerTopicMode =
  | 'ROTE' | 'PROJECT_DEEP_DIVE' | 'AI_TECH' | 'CODE_REVIEW' | 'FULL_PROCESS' | 'TRANSITION_TEACHING'

export interface InterviewerProfile {
  id: number
  code: string | null
  name: string
  description: string | null
  systemPrompt: string
  topicMode: InterviewerTopicMode
  focusTags: string[]
  defaultQuestionLimit: number
  defaultFollowUpLimit: number
  builtIn: boolean
  archived: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export interface InterviewerDraft {
  name: string
  description?: string | null
  systemPrompt: string
  topicMode: InterviewerTopicMode
  focusTags?: string[]
  defaultQuestionLimit: number
  defaultFollowUpLimit: number
}

export async function listInterviewers(includeArchived = false): Promise<InterviewerProfile[]> {
  const { data } = await http.get<InterviewerProfile[]>('/interviewers', {
    params: includeArchived ? { includeArchived: true } : {},
  })
  return data
}

export async function createInterviewer(draft: InterviewerDraft): Promise<InterviewerProfile> {
  const { data } = await http.post<InterviewerProfile>('/interviewers', draft)
  return data
}

export async function copyInterviewer(id: number, name?: string): Promise<InterviewerProfile> {
  const { data } = await http.post<InterviewerProfile>(`/interviewers/${id}/copy`, { name })
  return data
}

export async function updateInterviewer(id: number, draft: InterviewerDraft): Promise<InterviewerProfile> {
  const { data } = await http.put<InterviewerProfile>(`/interviewers/${id}`, draft)
  return data
}

export async function archiveInterviewer(id: number): Promise<InterviewerProfile> {
  const { data } = await http.post<InterviewerProfile>(`/interviewers/${id}/archive`)
  return data
}

export async function unarchiveInterviewer(id: number): Promise<InterviewerProfile> {
  const { data } = await http.post<InterviewerProfile>(`/interviewers/${id}/unarchive`)
  return data
}

export async function deleteInterviewer(id: number): Promise<void> {
  await http.delete(`/interviewers/${id}`)
}

export const INTERVIEWER_TOPIC_MODES: { value: InterviewerTopicMode; label: string }[] = [
  { value: 'ROTE', label: '八股文专项训练' },
  { value: 'PROJECT_DEEP_DIVE', label: '技术面（项目深挖）' },
  { value: 'AI_TECH', label: 'AI 技术专项训练' },
  { value: 'CODE_REVIEW', label: '代码判断/审查' },
  { value: 'FULL_PROCESS', label: '企业完整流程（模拟）' },
  { value: 'TRANSITION_TEACHING', label: '转行入门教学' },
]

export function topicModeLabel(mode: string): string {
  return INTERVIEWER_TOPIC_MODES.find((item) => item.value === mode)?.label ?? mode
}
