import { clearCsrf, http, initializeCsrf } from './http'

import type { CurrentUser, SetupStatus } from '@/types/api'

export async function getSetupStatus(): Promise<SetupStatus> {
  const { data } = await http.get<SetupStatus>('/setup/status')
  return data
}

export async function setupAccount(payload: {
  username: string
  password: string
}): Promise<void> {
  await http.post('/setup', payload)
  await initializeCsrf(true)
}

export async function login(payload: {
  username: string
  password: string
}): Promise<CurrentUser | null> {
  const { data } = await http.post<CurrentUser | null>('/auth/login', payload)
  await initializeCsrf(true)
  return data
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const { data } = await http.get<CurrentUser>('/auth/me')
  return data
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout')
  clearCsrf()
}

export async function changePassword(payload: {
  currentPassword: string
  newPassword: string
}): Promise<void> {
  await http.put('/auth/password', payload)
  clearCsrf()
}
