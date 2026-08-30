import { http } from './http'
import type { PageResult } from '@/types/api'

/* 通知中心 —— 对应后端 /notifications（事件收件箱：列表、未读数、标记已读；标记已读不删除业务记录） */

export type NotificationEventType =
  | 'INTERVIEW_REPORT_READY'
  | 'INTERVIEW_REPORT_FAILED'
  | 'KNOWLEDGE_BUILD_FAILED'
  | 'PROJECT_IMPORT_PARTIAL'
  | 'STUDY_TASK_DUE'

export interface NotificationItem {
  id: number
  eventType: NotificationEventType
  title: string
  content: string
  resourceType: string | null
  resourceId: number | null
  resourceRoute: string | null
  read: boolean
  readAt: string | null
  createdAt: string
}

export interface NotificationQuery {
  unreadOnly?: boolean
  page?: number
  size?: number
}

export async function listNotifications(query: NotificationQuery = {}): Promise<PageResult<NotificationItem>> {
  const { data } = await http.get<PageResult<NotificationItem>>('/notifications', {
    params: {
      unreadOnly: query.unreadOnly ?? false,
      page: query.page ?? 1,
      size: query.size ?? 20,
    },
  })
  return data
}

export async function getUnreadCount(): Promise<number> {
  const { data } = await http.get<{ count: number }>('/notifications/unread-count')
  return data.count
}

export async function markNotificationRead(id: number): Promise<void> {
  await http.post(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<number> {
  const { data } = await http.post<{ updated: number }>('/notifications/read-all')
  return data.updated
}

export const NOTIFICATION_ICONS: Record<NotificationEventType, string> = {
  INTERVIEW_REPORT_READY: '📝',
  INTERVIEW_REPORT_FAILED: '⚠️',
  KNOWLEDGE_BUILD_FAILED: '🧩',
  PROJECT_IMPORT_PARTIAL: '📦',
  STUDY_TASK_DUE: '⏰',
}

export function notificationIcon(type: NotificationEventType): string {
  return NOTIFICATION_ICONS[type] ?? '🔔'
}
