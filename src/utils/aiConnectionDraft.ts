import type { AiConnection, AiConnectionPayload } from '@/types/api'

type TestableConnectionFields = Pick<
  AiConnectionPayload,
  | 'providerType'
  | 'baseUrl'
  | 'endpointPath'
  | 'protocol'
  | 'modelName'
  | 'timeoutMs'
>

const TESTABLE_FIELDS: (keyof TestableConnectionFields)[] = [
  'providerType',
  'baseUrl',
  'endpointPath',
  'protocol',
  'modelName',
  'timeoutMs',
]

export function isAiConnectionDraftDirty(
  saved: AiConnection | null,
  draft: AiConnectionPayload,
): boolean {
  if (!saved || Boolean(draft.apiKey)) return true
  return TESTABLE_FIELDS.some((field) => saved[field] !== draft[field])
}
