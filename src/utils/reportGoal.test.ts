import { describe, expect, it } from 'vitest'
import { gapFromReason, gapKey } from './reportGoal'

describe('report goal identity', () => {
  it('keeps different full gaps distinct even when the display prefix is identical', () => {
    const a = 'Redis Cluster architecture and failover'
    const b = 'Redis Cluster architecture and data consistency'
    expect(gapKey(a)).not.toBe(gapKey(b))
    expect(gapFromReason(`来自面试报告。完整描述：${a}`)).toBe(gapKey(a))
  })

  it('normalizes whitespace and does not infer original gaps from shortened titles', () => {
    expect(gapFromReason('完整描述： Redis   failover ')).toBe('Redis failover')
    expect(gapFromReason('Redis Cluster…')).toBeNull()
  })
})
