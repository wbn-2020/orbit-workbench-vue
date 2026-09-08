import { http } from './http'

import type { FocusSession } from './types'

export type FocusTimerMode = 'focus' | 'break'

export function captureFocusStart(
  mode: FocusTimerMode,
  currentStartedAt: string | null,
  now: () => string = () => new Date().toISOString(),
): string | null {
  if (mode !== 'focus') return null
  return currentStartedAt ?? now()
}

export function clearFocusStart(): null {
  return null
}

export interface SaveFocusSessionInput {
  startedAt: string
  durationMinutes: number
  mode: FocusSession['mode']
  label?: string
  idempotencyKey?: string
}

export type BackendFocusMode = 'FOCUS' | 'BREAK'

export interface BackendFocusSession extends Omit<FocusSession, 'mode'> {
  mode: BackendFocusMode
}

const FOCUS_MODE_MAP: Record<BackendFocusMode, FocusSession['mode']> = {
  FOCUS: 'focus',
  BREAK: 'break',
}

export function transformFocusSession(session: BackendFocusSession): FocusSession {
  return {
    ...session,
    mode: FOCUS_MODE_MAP[session.mode],
  }
}

export async function saveFocusSession(input: SaveFocusSessionInput): Promise<FocusSession> {
  const { idempotencyKey, ...body } = input
  const response = idempotencyKey
    ? await http.post<BackendFocusSession>('/focus-sessions', body, {
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    : await http.post<BackendFocusSession>('/focus-sessions', body)
  const { data } = response
  return transformFocusSession(data)
}

export async function listFocusSessions(): Promise<FocusSession[]> {
  const { data } = await http.get<BackendFocusSession[]>('/focus-sessions')
  return data.map(transformFocusSession)
}
