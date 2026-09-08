import { http } from './http'

import type { FocusStat, LearningGoal } from './types'

export interface CreateLearningGoalInput {
  title: string
  reason: string
  linkedSkill?: string
}

export type BackendLearningGoalStatus = 'ACTIVE' | 'PAUSED' | 'DONE'

export interface BackendLearningGoal extends Omit<LearningGoal, 'status' | 'linkedSkill'> {
  status: BackendLearningGoalStatus
  linkedSkill: string | null
}

const LEARNING_GOAL_STATUS_MAP: Record<BackendLearningGoalStatus, LearningGoal['status']> = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  DONE: 'done',
}

export function transformLearningGoal(goal: BackendLearningGoal): LearningGoal {
  return {
    ...goal,
    status: LEARNING_GOAL_STATUS_MAP[goal.status],
    linkedSkill: goal.linkedSkill ?? undefined,
  }
}

export async function listLearningGoals(): Promise<LearningGoal[]> {
  const { data } = await http.get<BackendLearningGoal[]>('/learning-goals')
  return data.map(transformLearningGoal)
}

export async function createLearningGoal(
  input: CreateLearningGoalInput,
  idempotencyKey?: string,
): Promise<LearningGoal> {
  const response = idempotencyKey
    ? await http.post<BackendLearningGoal>('/learning-goals', input, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    : await http.post<BackendLearningGoal>('/learning-goals', input)
  const { data } = response
  return transformLearningGoal(data)
}

export interface UpdateLearningGoalInput {
  status: BackendLearningGoalStatus
  progress: number
}

export async function updateLearningGoal(
  id: string,
  input: UpdateLearningGoalInput,
): Promise<LearningGoal> {
  const { data } = await http.put<BackendLearningGoal>(`/learning-goals/${id}`, input)
  return transformLearningGoal(data)
}

export async function listFocusStats(days = 7): Promise<FocusStat[]> {
  const { data } = await http.get<FocusStat[]>('/focus-stats', { params: { days } })
  return data
}
