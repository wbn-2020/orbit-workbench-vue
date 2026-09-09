import { http } from './http'

export interface KnowledgeFactItem {
  id: string
  title: string
  content: string
  createdAt: string
}

export interface KnowledgeCardItem {
  id: string
  title: string
  summary: string
  createdAt: string
}

export interface KnowledgeOverview {
  projectFacts: {
    confirmed: number
    analyzed: number
    archived: number
    recent: KnowledgeFactItem[]
  }
  knowledgeCards: {
    total: number
    recent: KnowledgeCardItem[]
  }
  projectChunks: {
    total: number
  }
}

export async function getKnowledgeOverview(): Promise<KnowledgeOverview> {
  const { data } = await http.get<KnowledgeOverview>('/knowledge-overview')
  return data
}
