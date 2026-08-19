export function createIdempotencyKey(scope: string): string {
  return `${scope}:${globalThis.crypto.randomUUID()}`
}
