import { describe, expect, it } from 'vitest'

import type { AiConnection, AiConnectionPayload } from '@/types/api'

import { isAiConnectionDraftDirty } from './aiConnectionDraft'

const saved: AiConnection = {
  id: 1,
  version: 1,
  name: 'Saved',
  providerType: 'OPENAI',
  baseUrl: 'https://api.example.com/v1',
  endpointPath: '/chat/completions',
  protocol: 'CHAT_COMPLETIONS',
  modelName: 'model-a',
  timeoutMs: 30_000,
  enabled: true,
}

const draft: AiConnectionPayload = {
  name: saved.name,
  providerType: saved.providerType,
  baseUrl: saved.baseUrl,
  endpointPath: saved.endpointPath,
  protocol: saved.protocol,
  modelName: saved.modelName,
  timeoutMs: saved.timeoutMs ?? 30_000,
  enabled: saved.enabled,
}

describe('isAiConnectionDraftDirty', () => {
  it('uses the saved test only when testable fields are unchanged', () => {
    expect(isAiConnectionDraftDirty(saved, draft)).toBe(false)
  })

  it('requires a draft test after editing endpoint configuration', () => {
    expect(
      isAiConnectionDraftDirty(saved, {
        ...draft,
        endpointPath: '/responses',
      }),
    ).toBe(true)
  })

  it('requires a draft test when a new API key is entered', () => {
    expect(isAiConnectionDraftDirty(saved, { ...draft, apiKey: 'new-key' })).toBe(true)
  })
})
