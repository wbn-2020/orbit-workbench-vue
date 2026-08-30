import { http } from './http'

/* 今日工作台日程 —— 对应后端 /schedule（自定义日程落表 + 面试/复习/投递实时派生的统一聚合） */

export type ScheduleSourceType = 'CUSTOM' | 'STUDY_TASK' | 'INTERVIEW' | 'APPLICATION'
export type ScheduleStatus = 'PLANNED' | 'COMPLETED' | 'CANCELLED'

export interface AgendaItem {
  sourceType: ScheduleSourceType
  sourceId: number
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  status: ScheduleStatus
  resourceRoute: string | null
}

export interface ScheduleEvent {
  id: number
  sourceType: ScheduleSourceType
  title: string
  startAt: string
  endAt: string | null
  allDay: boolean
  status: ScheduleStatus
  reminderMinutes: number | null
  resourceRoute: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSchedulePayload {
  title: string
  startAt: string
  endAt?: string | null
  allDay: boolean
  reminderMinutes?: number | null
  resourceRoute?: string | null
  note?: string | null
}

export async function getAgenda(from: Date, to: Date): Promise<AgendaItem[]> {
  const { data } = await http.get<AgendaItem[]>('/schedule/agenda', {
    params: { from: from.toISOString(), to: to.toISOString() },
  })
  return data
}

export async function createScheduleEvent(payload: CreateSchedulePayload): Promise<ScheduleEvent> {
  const { data } = await http.post<ScheduleEvent>('/schedule/events', payload)
  return data
}

export async function completeScheduleEvent(id: number): Promise<ScheduleEvent> {
  const { data } = await http.post<ScheduleEvent>(`/schedule/events/${id}/complete`)
  return data
}

export async function cancelScheduleEvent(id: number): Promise<ScheduleEvent> {
  const { data } = await http.post<ScheduleEvent>(`/schedule/events/${id}/cancel`)
  return data
}

export async function deleteScheduleEvent(id: number): Promise<void> {
  await http.delete(`/schedule/events/${id}`)
}

export const SCHEDULE_SOURCE_LABELS: Record<ScheduleSourceType, string> = {
  CUSTOM: '自定义',
  STUDY_TASK: '复习',
  INTERVIEW: '面试',
  APPLICATION: '投递',
}

export const SCHEDULE_SOURCE_ICONS: Record<ScheduleSourceType, string> = {
  CUSTOM: '️',
  STUDY_TASK: '📚',
  INTERVIEW: '💼',
  APPLICATION: '📨',
}

export function scheduleSourceLabel(type: ScheduleSourceType): string {
  return SCHEDULE_SOURCE_LABELS[type] ?? type
}

export function scheduleSourceIcon(type: ScheduleSourceType): string {
  return SCHEDULE_SOURCE_ICONS[type] ?? '🗓️'
}
