import { http } from './http'

/* 知识库（RAG 第一版：项目知识块检索 + AI 带来源回答）与项目画像事实 */

export interface KnowledgeBuildResult {
  chunkCount: number
  fileCount: number
}

export async function buildKnowledge(
  projectId: number,
  versionId: number,
): Promise<KnowledgeBuildResult> {
  const { data } = await http.post<KnowledgeBuildResult>(
    `/projects/${projectId}/versions/${versionId}/knowledge/build`,
  )
  return data
}

export interface KnowledgeSource {
  relativePath: string
  chunkNo: number
  snippet: string
}

export interface AskResult {
  answer: string | null
  insufficient: boolean
  sources: KnowledgeSource[]
}

export async function askKnowledge(
  question: string,
  projectVersionId?: number | null,
): Promise<AskResult> {
  const { data } = await http.post<AskResult>('/knowledge/ask', {
    question,
    projectVersionId: projectVersionId ?? undefined,
  })
  return data
}

export type FactType =
  | 'BUSINESS' | 'STRUCTURE' | 'RISK' | 'RESPONSIBILITY' | 'TECH_STACK' | 'OTHER'

export interface ProjectFact {
  id: number
  factType: FactType
  title: string
  content: string
  source: 'AI_ANALYZED' | 'USER_CONFIRMED'
  confirmationStatus: 'ANALYZED' | 'CONFIRMED' | 'ARCHIVED'
  confidence: number | null
  confirmedAt: string | null
}

export const FACT_TYPE_LABELS: Record<FactType, string> = {
  BUSINESS: '业务背景',
  STRUCTURE: '结构',
  RISK: '风险点',
  RESPONSIBILITY: '可能负责部分',
  TECH_STACK: '技术栈',
  OTHER: '其他',
}

export async function listFacts(projectId: number, versionId: number): Promise<ProjectFact[]> {
  const { data } = await http.get<{ facts: ProjectFact[] }>(
    `/projects/${projectId}/versions/${versionId}/facts`,
  )
  return data.facts
}

export async function generateFacts(
  projectId: number,
  versionId: number,
  connectionId?: number,
): Promise<ProjectFact[]> {
  const { data } = await http.post<{ facts: ProjectFact[] }>(
    `/projects/${projectId}/versions/${versionId}/facts/generate`,
    connectionId ? { connectionId } : {},
  )
  return data.facts
}

export async function confirmFact(
  projectId: number,
  versionId: number,
  factId: number,
  payload: { factType: FactType; title: string; content: string },
): Promise<ProjectFact> {
  const { data } = await http.post<ProjectFact>(
    `/projects/${projectId}/versions/${versionId}/facts/${factId}/confirm`,
    payload,
  )
  return data
}

export async function archiveFact(
  projectId: number,
  versionId: number,
  factId: number,
): Promise<ProjectFact> {
  const { data } = await http.post<ProjectFact>(
    `/projects/${projectId}/versions/${versionId}/facts/${factId}/archive`,
  )
  return data
}
