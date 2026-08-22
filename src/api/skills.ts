import { http } from './http'

import type { Skill, SkillVersion } from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

export interface SkillVersionPayload {
  promptVersionId: number
  inputSchema?: Record<string, unknown>
  outputType: string
  runtimeLimits?: Record<string, unknown>
  toolVersionIds?: number[]
  expectedVersion?: number | null
}

export interface SkillPayload {
  workspaceId: number
  skillCode: string
  name: string
  description?: string | null
  version: SkillVersionPayload
  expectedVersion?: number | null
}

export async function listSkills(workspaceId: number): Promise<Skill[]> {
  const { data } = await http.get<Skill[]>('/skills', { params: { workspaceId } })
  return data
}

export async function getSkill(id: number): Promise<Skill> {
  const { data } = await http.get<Skill>(`/skills/${id}`)
  return data
}

export async function createSkill(payload: SkillPayload): Promise<Skill> {
  const { data } = await http.post<Skill>('/skills', payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey('skill-create') },
  })
  return data
}

export async function updateSkill(id: number, payload: SkillPayload): Promise<Skill> {
  const { data } = await http.put<Skill>(`/skills/${id}`, payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`skill-update-${id}`) },
  })
  return data
}

export async function createSkillVersion(
  id: number,
  payload: SkillVersionPayload,
): Promise<Skill> {
  const { data } = await http.post<Skill>(`/skills/${id}/versions`, payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`skill-version-${id}`) },
  })
  return data
}

export async function publishSkill(
  id: number,
  versionId?: number | null,
): Promise<Skill> {
  const { data } = await http.post<Skill>(`/skills/${id}/publish`, versionId ? { versionId } : {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`skill-publish-${id}`) },
  })
  return data
}

export async function disableSkill(id: number): Promise<Skill> {
  const { data } = await http.post<Skill>(`/skills/${id}/disable`, {}, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`skill-disable-${id}`) },
  })
  return data
}

export function draftVersion(skill: Skill): SkillVersion | undefined {
  return skill.versions.find((version) => version.status === 'DRAFT')
}
