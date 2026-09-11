export async function consumeSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: string, data: string) => void,
): Promise<void> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let event = 'message'
  let data: string[] = []
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) throw new Error('生成连接提前结束，未收到完成确认，请刷新后重试')
      buffer += decoder.decode(chunk.value, { stream: true })
      let newline: number
      while ((newline = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newline).replace(/\r$/, '')
        buffer = buffer.slice(newline + 1)
        if (!line) {
          if (data.length) {
            onEvent(event, data.join('\n'))
            if (event === 'done' || event === 'error') return
          }
          event = 'message'
          data = []
        } else if (line.startsWith('event:')) {
          event = line.slice(6).replace(/^ /, '')
        } else if (line.startsWith('data:')) {
          data.push(line.slice(5).replace(/^ /, ''))
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
