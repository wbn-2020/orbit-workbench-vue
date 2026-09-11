import { describe, expect, it, vi } from 'vitest'
import { consumeSse } from './sse'

function stream(...chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)))
      controller.close()
    },
  })
}

describe('SSE completion contract', () => {
  it('rejects EOF without a terminal event, including partial frames', async () => {
    for (const body of ['', 'event:delta\ndata:partial\n\n', 'event:done\ndata:{}']) {
      await expect(consumeSse(stream(body), vi.fn())).rejects.toThrow('未收到完成确认')
    }
  })

  it('preserves token whitespace and handles CRLF across chunks', async () => {
    const handler = vi.fn()
    await consumeSse(stream('event:delta\r\ndata: hello ', ' \r\n\r', '\nevent:done\ndata:{}\n\n'), handler)
    expect(handler.mock.calls).toEqual([['delta', 'hello  '], ['done', '{}']])
  })

  it('stops after error without delivering subsequent events', async () => {
    const handler = vi.fn()
    await consumeSse(stream('event:error\ndata:failed\n\nevent:done\ndata:{}\n\n'), handler)
    expect(handler.mock.calls).toEqual([['error', 'failed']])
  })

  it('propagates malformed terminal payload errors and releases the stream', async () => {
    const body = stream('event:done\ndata:invalid\n\n')
    await expect(consumeSse(body, (_, data) => JSON.parse(data))).rejects.toThrow()
    expect(body.locked).toBe(false)
  })
})
