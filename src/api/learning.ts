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
    // V58：后端 primitives 恒下发，但 global non_null 契约下缺键要归一，不能让 undefined 溜进渲染
    taskCount: goal.taskCount ?? 0,
    completedTaskCount: goal.completedTaskCount ?? 0,
    progressDerived: goal.progressDerived ?? false,
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

/** V52：把一条已确认画像事实转成学习目标（幂等：重复转化后端返回 409）。 */
export async function createGoalFromFact(factId: number): Promise<LearningGoal> {
  const { data } = await http.post<BackendLearningGoal>(`/learning-goals/from-fact/${factId}`)
  return transformLearningGoal(data)
}

/**
 * V58：给目标拆一步执行任务（study_task GOAL 来源）。
 * 同名步骤幂等：后端返回 created=0，不堆重复任务。
 */
export async function addGoalTask(goalId: string, title: string): Promise<{ created: number }> {
  const { data } = await http.post<{ created: number }>(`/learning-goals/${goalId}/tasks`, { title })
  return data
}

export async function listFocusStats(days = 7): Promise<FocusStat[]> {
  const { data } = await http.get<FocusStat[]>('/focus-stats', { params: { days } })
  return data
}
