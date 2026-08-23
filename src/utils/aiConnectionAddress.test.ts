import { describe, expect, it } from 'vitest'

import { resolveAiConnectionUrl } from './aiConnectionAddress'

describe('resolveAiConnectionUrl', () => {
  it('preserves a complete request URL', () => {
    expect(resolveAiConnectionUrl(
      'https://chatapi.weixin.qq.com/openai/v1/chat/completions',
      '/chat/completions',
    )).toBe('https://chatapi.weixin.qq.com/openai/v1/chat/completions')
  })

  it('appends the endpoint for a legacy base URL', () => {
    expect(resolveAiConnectionUrl(
      'https://api.example.com/v1/',
      '/chat/completions',
    )).toBe('https://api.example.com/v1/chat/completions')
  })
})
