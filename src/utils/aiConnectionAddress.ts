export function resolveAiConnectionUrl(baseUrl: string, endpointPath: string): string {
  const normalizedBase = baseUrl.trim().replace(/\/+$/, '')
  const normalizedEndpoint = endpointPath.trim()
  if (!normalizedEndpoint) return normalizedBase

  const endpoint = normalizedEndpoint.startsWith('/')
    ? normalizedEndpoint
    : `/${normalizedEndpoint}`

  try {
    if (new URL(normalizedBase).pathname.endsWith(endpoint)) {
      return normalizedBase
    }
  } catch {
    return normalizedBase
  }

  return `${normalizedBase}${endpoint}`
}
