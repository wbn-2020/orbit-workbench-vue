import { describe, expect, it } from 'vitest'

import { csrfCookieMatches, shouldRetryCsrfRequest } from './http'

describe('csrfCookieMatches', () => {
  it('detects a cookie changed by another browser tab', () => {
    expect(
      csrfCookieMatches(
        { headerName: 'X-XSRF-TOKEN', token: 'cached-token' },
        'new-cookie-token',
      ),
    ).toBe(false)
  })

  it('accepts the cached token only while the cookie still matches', () => {
    expect(
      csrfCookieMatches(
        { headerName: 'X-XSRF-TOKEN', token: 'same-token' },
        'same-token',
      ),
    ).toBe(true)
  })
})

describe('shouldRetryCsrfRequest', () => {
  it('retries a failed write request only once', () => {
    expect(shouldRetryCsrfRequest(403, 'post', false, '/tasks')).toBe(true)
    expect(shouldRetryCsrfRequest(403, 'post', true, '/tasks')).toBe(false)
  })

  it('does not retry reads or non-forbidden failures', () => {
    expect(shouldRetryCsrfRequest(403, 'get', false, '/tasks')).toBe(false)
    expect(shouldRetryCsrfRequest(409, 'post', false, '/tasks')).toBe(false)
  })
})
