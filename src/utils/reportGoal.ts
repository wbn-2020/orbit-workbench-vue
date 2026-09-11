export function gapKey(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function gapFromReason(reason: string | null | undefined): string | null {
  const marker = '完整描述：'
  const index = reason?.indexOf(marker) ?? -1
  return index >= 0 ? gapKey(reason!.slice(index + marker.length)) : null
}
