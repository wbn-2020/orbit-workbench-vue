import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios'

import type { CsrfToken, ProblemDetail } from '@/types/api'

const API_BASE_URL = '/api/v1'
const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete'])

let csrfToken: CsrfToken | null = null
let csrfRequest: Promise<CsrfToken> | null = null
let unauthorizedHandler: (() => void) | null = null

interface CsrfRetryConfig extends InternalAxiosRequestConfig {
  csrfRetryAttempted?: boolean
}

const csrfClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 15_000,
})

export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: 30_000,
  headers: {
    Accept: 'application/json',
  },
})

export async function initializeCsrf(force = false): Promise<CsrfToken> {
  if (csrfToken && !force) return csrfToken
  if (csrfRequest) return csrfRequest
  if (force) csrfToken = null

  csrfRequest = csrfClient
    .get<{ headerName: string }>('/auth/csrf')
    .then(({ data }) => {
      const token = readCookie('XSRF-TOKEN')
      if (!token) {
        throw new Error('CSRF Cookie 不存在')
      }
      csrfToken = { headerName: data.headerName, token }
      return csrfToken
    })
    .finally(() => {
      csrfRequest = null
    })

  return csrfRequest
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${encodeURIComponent(name)}=`
  const value = document.cookie
    .split('; ')
    .find((item) => item.startsWith(prefix))
    ?.slice(prefix.length)
  return value ? decodeURIComponent(value) : null
}

export function clearCsrf(): void {
  csrfToken = null
  csrfRequest = null
}

function invalidateCsrfToken(): void {
  csrfToken = null
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function csrfCookieMatches(
  cachedToken: CsrfToken | null,
  cookieToken: string | null,
): boolean {
  return Boolean(cachedToken && cookieToken && cachedToken.token === cookieToken)
}

export function shouldRetryCsrfRequest(
  status: number | undefined,
  method: string | undefined,
  retryAttempted: boolean | undefined,
  url: string,
): boolean {
  return Boolean(
    status === 403 &&
    method &&
    WRITE_METHODS.has(method.toLowerCase()) &&
    !retryAttempted &&
    !url.endsWith('/auth/csrf'),
  )
}

async function currentCsrfToken(): Promise<CsrfToken> {
  const cookieToken = readCookie('XSRF-TOKEN')
  if (csrfCookieMatches(csrfToken, cookieToken)) return csrfToken as CsrfToken
  return initializeCsrf(true)
}

http.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase()
  if (!method || !WRITE_METHODS.has(method) || config.url === '/auth/csrf') {
    return config
  }

  const token = await currentCsrfToken()
  const headers = AxiosHeaders.from(config.headers)
  headers.set(token.headerName, token.token)
  if (token.headerName !== 'X-XSRF-TOKEN') {
    headers.set('X-XSRF-TOKEN', token.token)
  }
  config.headers = headers
  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const url = String(error.config?.url || '')
    const config = error.config as CsrfRetryConfig | undefined
    const method = config?.method?.toLowerCase()

    if (
      config &&
      shouldRetryCsrfRequest(status, method, config.csrfRetryAttempted, url)
    ) {
      config.csrfRetryAttempted = true
      invalidateCsrfToken()
      await initializeCsrf(true)
      return http.request(config)
    }

    if (status === 401 && !url.endsWith('/auth/login')) {
      clearCsrf()
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  },
)

export function getProblem(error: unknown): ProblemDetail {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ProblemDetail>
    const data = axiosError.response?.data
    if (data && typeof data === 'object' && 'title' in data) {
      return {
        ...data,
        status: data.status ?? axiosError.response?.status ?? 500,
      }
    }

    if (axiosError.code === 'ECONNABORTED') {
      return {
        title: '请求超时',
        status: 408,
        detail: '服务响应时间过长，请稍后重试。',
        errorCode: 'REQUEST_TIMEOUT',
      }
    }

    if (!axiosError.response) {
      return {
        title: '无法连接服务',
        status: 0,
        detail: '请确认后端服务可用后重试。',
        errorCode: 'NETWORK_ERROR',
      }
    }

    // 有响应但不是 ProblemDetail（网关 502、HTML 错误页等）：不能把 axios 的英文原文当用户提示。
    return {
      title: '服务返回了无法解析的错误',
      status: axiosError.response.status,
      detail: `服务返回 HTTP ${axiosError.response.status}，且没有给出标准错误说明。请稍后重试。`,
      errorCode: 'UNPARSED_ERROR_RESPONSE',
    }
  }

  return {
    title: '请求失败',
    status: 500,
    detail: error instanceof Error ? error.message : '发生未知错误。',
    errorCode: 'UNKNOWN_ERROR',
  }
}

export function problemMessage(error: unknown): string {
  const problem = getProblem(error)
  return problem.detail || problem.title
}

export type RequestConfig = AxiosRequestConfig

/**
 * 后端把缺省与空串一律按「不过滤」处理，但 axios 仍会把 undefined 发成 `days=` 这类空参数，
 * 因此查询参数在出门前统一剔除空值。
 */
export function cleanParams(input: object): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') out[key] = value
  })
  return out
}
