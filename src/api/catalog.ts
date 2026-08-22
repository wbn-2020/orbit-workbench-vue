import { http } from './http'

import type {
  AgentDefinitionDetail,
  AgentDefinitionSummary,
  PromptVersionSummary,
  ToolDefinition,
} from '@/types/api'

export async function listToolDefinitions(): Promise<ToolDefinition[]> {
  const { data } = await http.get<ToolDefinition[]>('/tool-definitions')
  return data
}

export async function getToolDefinition(id: number): Promise<ToolDefinition> {
  const { data } = await http.get<ToolDefinition>(`/tool-definitions/${id}`)
  return data
}

export async function listAgentDefinitions(): Promise<AgentDefinitionSummary[]> {
  const { data } = await http.get<AgentDefinitionSummary[]>('/agent-definitions')
  return data
}

export async function getAgentDefinition(id: number): Promise<AgentDefinitionDetail> {
  const { data } = await http.get<AgentDefinitionDetail>(`/agent-definitions/${id}`)
  return data
}

export async function listPromptVersions(
  templateId: number,
): Promise<PromptVersionSummary[]> {
  const { data } = await http.get<PromptVersionSummary[]>(
    `/prompt-templates/${templateId}/versions`,
  )
  return data
}
