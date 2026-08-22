import { http } from './http'

import type { Memory, MemoryCandidate, PageResult } from '@/types/api'
import { createIdempotencyKey } from '@/utils/idempotency'

export interface MemoryPayload {
  workspaceId: number
  memoryType: string
  content: Record<string, unknown>
  sourceType: string
  sourceId?: number | null
  confidence?: number | null
  expiresAt?: string | null
  expectedVersion?: number | null
}

export interface MemoryCandidatePayload {
  workspaceId: number
  memoryType: string
  content: Record<string, unknown>
  sourceType: string
  sourceId?: number | null
  confidence?: number | null
  expiresAt?: string | null
}

export async function listMemories(params: {
  workspaceId?: number
  status?: string
  memoryType?: string
  q?: string
  page?: number
  size?: number
}): Promise<PageResult<Memory>> {
  const { data } = await http.get<PageResult<Memory>>('/memories', { params })
  return data
}

export async function createMemory(payload: MemoryPayload): Promise<Memory> {
  const { data } = await http.post<Memory>('/memories', payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey('memory-create') },
  })
  return data
}

export async function updateMemory(id: number, payload: MemoryPayload): Promise<Memory> {
  const { data } = await http.put<Memory>(`/memories/${id}`, payload, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-update-${id}`) },
  })
  return data
}

export async function archiveMemory(id: number, expectedVersion: number): Promise<Memory> {
  const { data } = await http.post<Memory>(`/memories/${id}/archive`, { expectedVersion }, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-archive-${id}`) },
  })
  return data
}

export async function deleteMemory(id: number, expectedVersion: number): Promise<void> {
  await http.delete(`/memories/${id}`, {
    data: { expectedVersion },
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-delete-${id}`) },
  })
}

export async function listMemoryCandidates(params: {
  workspaceId?: number
  status?: string
  page?: number
  size?: number
}): Promise<PageResult<MemoryCandidate>> {
  const { data } = await http.get<PageResult<MemoryCandidate>>('/memories/candidates', { params })
  return data
}

export async function confirmMemoryCandidate(
  id: number,
  expectedVersion: number,
): Promise<Memory> {
  const { data } = await http.post<Memory>(`/memories/candidates/${id}/confirm`, {
    expectedVersion,
  }, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-candidate-confirm-${id}`) },
  })
  return data
}

export async function rejectMemoryCandidate(
  id: number,
  expectedVersion: number,
): Promise<MemoryCandidate> {
  const { data } = await http.post<MemoryCandidate>(`/memories/candidates/${id}/reject`, {
    expectedVersion,
  }, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-candidate-reject-${id}`) },
  })
  return data
}

export async function archiveMemoryCandidate(
  id: number,
  expectedVersion: number,
): Promise<MemoryCandidate> {
  const { data } = await http.post<MemoryCandidate>(`/memories/candidates/${id}/archive`, {
    expectedVersion,
  }, {
    headers: { 'Idempotency-Key': createIdempotencyKey(`memory-candidate-archive-${id}`) },
  })
  return data
}
