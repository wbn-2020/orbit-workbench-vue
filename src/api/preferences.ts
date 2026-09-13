import { http } from './http'

import type { UserPreferences } from '@/types/api'

export interface UpdatePreferencesPayload {
  notifyReportReady: boolean
  notifyStudyDue: boolean
  notifyInterview: boolean
  notifyImportFailure: boolean
  notifyAiFailure: boolean
  timezoneId: string
  /** 保留期：null = 永久保留（默认）；非空时 7-3650 天 */
  auditRetentionDays: number | null
  notificationRetentionDays: number | null
  expectedVersion: number
}

export async function getPreferences(): Promise<UserPreferences> {
  const { data } = await http.get<UserPreferences>('/preferences')
  return data
}

export async function updatePreferences(
  payload: UpdatePreferencesPayload,
): Promise<UserPreferences> {
  const { data } = await http.put<UserPreferences>('/preferences', payload)
  return data
}
