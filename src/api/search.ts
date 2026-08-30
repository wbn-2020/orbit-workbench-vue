import { http } from './http'

/* 全局搜索 —— 对应后端 /search（按用户隔离聚合五个数据域的只读检索） */

export type SearchDomain = 'PROJECT' | 'KNOWLEDGE' | 'INTERVIEW' | 'REPORT' | 'APPLICATION'

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
