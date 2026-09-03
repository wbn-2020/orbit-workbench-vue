import { http } from './http'

/* 全局搜索 —— 对应后端 /search（按用户隔离聚合八个数据域的只读检索） */

export type SearchDomain =
  | 'PROJECT'
  | 'KNOWLEDGE'
  | 'INTERVIEW'
  | 'REPORT'
  | 'APPLICATION'
  | 'PROJECT_FACT'
  | 'INTERVIEWER'
  | 'STUDY_TASK'

export type SearchDomainIcon =
  | 'folder-kanban'
  | 'book-open'
  | 'notebook-pen'
  | 'file-bar-chart'
  | 'briefcase-business'
  | 'badge-check'
  | 'users-round'
  | 'clipboard-check'

export type SearchDomainTone = 'brand' | 'purple' | 'green' | 'orange' | 'gold'

export interface SearchDomainMeta {
  label: string
  icon: SearchDomainIcon
  tone: SearchDomainTone
}

/** 搜索分组的展示元数据由前端固定，避免后端文案变化导致标签或视觉语义漂移。 */
export const SEARCH_DOMAIN_META: Record<SearchDomain, SearchDomainMeta> = {
  PROJECT: { label: '项目资料', icon: 'folder-kanban', tone: 'brand' },
  KNOWLEDGE: { label: '知识块', icon: 'book-open', tone: 'purple' },
  INTERVIEW: { label: '面试记录', icon: 'notebook-pen', tone: 'green' },
  REPORT: { label: '面试报告', icon: 'file-bar-chart', tone: 'orange' },
  APPLICATION: { label: '投递记录', icon: 'briefcase-business', tone: 'gold' },
  PROJECT_FACT: { label: '画像事实', icon: 'badge-check', tone: 'gold' },
  INTERVIEWER: { label: '面试官', icon: 'users-round', tone: 'brand' },
  STUDY_TASK: { label: '复习任务', icon: 'clipboard-check', tone: 'orange' },
}

export interface SearchHit {
  type: SearchDomain
  id: number
  title: string
  /* 后端按 non_null 序列化：无正文摘要时该字段缺省 */
  snippet?: string | null
  sub?: string | null
  route: string
}

export interface SearchGroup {
  type: SearchDomain
  label: string
  total: number
  items: SearchHit[]
}

export interface SearchResponse {
  query: string
  total: number
  groups: SearchGroup[]
}

export async function searchAll(query: string): Promise<SearchResponse> {
  const { data } = await http.get<SearchResponse>('/search', { params: { q: query } })
  return data
}
