export interface LatestRequestGuard {
  begin: () => number
  invalidate: () => void
  isCurrent: (requestId: number) => boolean
}

export function createLatestRequestGuard(): LatestRequestGuard {
  let latestRequestId = 0

  return {
    begin() {
      latestRequestId += 1
      return latestRequestId
    },
    invalidate() {
      latestRequestId += 1
    },
    isCurrent(requestId) {
      return requestId === latestRequestId
    },
  }
}
