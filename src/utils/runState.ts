import type { RunStatus } from '@/types/api'

const CANCELLABLE_STATUSES: RunStatus[] = [
  'QUEUED',
  'RUNNING',
  'WAITING_USER',
  'PAUSED',
  'PAUSING',
]

const RETRYABLE_STATUSES: RunStatus[] = [
  'FAILED',
  'CANCELLED',
  'RECOVERY_REQUIRED',
]

export function canCancelRun(status?: RunStatus | null): boolean {
  return Boolean(status && CANCELLABLE_STATUSES.includes(status))
}

export function canRetryRun(status?: RunStatus | null): boolean {
  return Boolean(status && RETRYABLE_STATUSES.includes(status))
}
