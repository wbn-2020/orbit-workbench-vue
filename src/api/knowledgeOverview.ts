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

export interface DueCard {
  id: string
  title: string
  summary: string
  tags: string[]
  nextReviewDate: string | null
  overdueDays: number
  reviewStage: number
}

export async function getDueCards(): Promise<DueCard[]> {
  const { data } = await http.get<{ cards: DueCard[] }>('/knowledge-cards/due')
  return data.cards
}

export async function reviewCard(id: string): Promise<{ id: string; reviewStage: number; nextReviewDate: string }> {
  const { data } = await http.post(`/knowledge-cards/${id}/review`)
  return data
}
