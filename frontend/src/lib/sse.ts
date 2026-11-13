/**
 * Read a server-sent-events response body and call `onEvent` for each event.
 * Returning 'stop' from `onEvent` ends reading early; otherwise it resolves when the stream ends.
 * Resolves true if stopped by the handler, false if the stream simply ended.
 */
export async function readSSE(
  response: Response,
  onEvent: (event: string | undefined, data: any) => void | 'stop' // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<boolean> {
  if (!response.body) throw new Error('Response has no body')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) return false
    buffer += value
    let end
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      const event = raw.match(/^event: (.*)$/m)?.[1]
      const data = JSON.parse(raw.match(/^data: (.*)$/m)?.[1] ?? '{}')
      if (onEvent(event, data) === 'stop') {
        reader.cancel().catch(() => {})
        return true
      }
    }
  }
}
