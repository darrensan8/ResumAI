import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ArrowUp, X } from 'lucide-react'
import { API_URL } from '../lib/api'
import { authHeaders } from '../lib/auth'
import { readSSE } from '../lib/sse'
import FormError from './FormError'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'How do I raise my lowest score?',
  'Rewrite my weakest bullet',
  'What will interviewers ask me about?',
  'Which missing keywords matter most?',
]

type ChatPanelProps = {
  open: boolean
  onClose: () => void
  /** When set, sending is disabled and this explains why. */
  disabledReason?: string
}

/**
 * Follow-up questions about the resume and its review, in a sheet that slides in from the
 * right (full screen on phones). It stays mounted while closed, so the conversation survives;
 * nothing is stored server-side.
 */
export default function ChatPanel({ open, onClose, disabledReason }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const controllerRef = useRef<AbortController | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const canSend = !disabledReason && !isStreaming

  async function send(text: string) {
    const question = text.trim()
    if (!question || !canSend) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const history: ChatMessage[] = [...messages, { role: 'user', content: question }]
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setError('')
    setIsStreaming(true)

    const appendToReply = (chunk: string) =>
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
      })

    try {
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(typeof body?.detail === 'string' ? body.detail : `HTTP ${response.status}`)
      }
      const finished = await readSSE(response, (event, data) => {
        if (event === 'delta') appendToReply(data.text)
        else if (event === 'done') return 'stop'
        else if (event === 'error') throw new Error(data.detail)
      })
      if (!finished) throw new Error('The reply was cut off')
    } catch (err) {
      if (controller.signal.aborted) return
      // Drop the failed exchange and give the question back so it can be retried.
      setMessages(messages)
      setInput(question)
      const detail = err instanceof Error ? err.message.replace(/\.$/, '') : ''
      setError(detail || 'Something went wrong. Try again')
    } finally {
      if (controllerRef.current === controller) setIsStreaming(false)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    send(input)
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  return (
    <aside
      aria-label="Ask about this review"
      aria-hidden={!open}
      className={
        'fixed inset-0 z-40 flex-col bg-paper lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[26rem] ' +
        'lg:border-l lg:border-line lg:shadow-[-16px_0_48px_rgb(31_27_22_/_0.10)] ' +
        (open ? 'animate-rise flex' : 'hidden')
      }
    >
      <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2 className="font-serif text-[22px] leading-tight font-normal text-ink">Ask about this review</h2>
          <p className="mt-1 text-sm leading-[20px] text-ink-2">Answers use your resume, the job and this review</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div>
            <p className="mb-3 text-sm text-ink-2">{disabledReason ?? 'Start with one of these, or ask your own'}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {STARTERS.map((q) => (
                <li key={q}>
                  <button
                    onClick={() => send(q)}
                    disabled={!canSend}
                    className="w-full rounded-lg border border-line-strong bg-paper px-3.5 py-2.5 text-left text-[15px] text-ink transition-colors duration-150 hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-ink disabled:pointer-events-none disabled:opacity-45"
                  >
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          messages.map((m, i) =>
            m.role === 'user' ? (
              <p
                key={i}
                className="m-0 max-w-[85%] self-end rounded-xl bg-raised px-3.5 py-2.5 text-[15px] leading-6 whitespace-pre-wrap text-ink"
              >
                {m.content}
              </p>
            ) : (
              <div key={i} className="max-w-full">
                <p className="mb-1 text-[13px] text-ink-3">Reviewer</p>
                {m.content ? (
                  <p className="m-0 text-[15px] leading-6 whitespace-pre-wrap text-ink">{m.content}</p>
                ) : (
                  <p className="m-0 flex items-center gap-2 text-sm text-ink-3">
                    <span className="animate-live h-1.5 w-1.5 rounded-full bg-blue-ink" aria-hidden="true" />
                    Thinking
                  </p>
                )}
              </div>
            )
          )
        )}
        {error && <FormError>{error}</FormError>}
      </div>

      <form onSubmit={onSubmit} className="border-t border-line px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
        <div className="flex items-end gap-2 rounded-xl border border-line-strong bg-paper p-2 transition-[border-color,box-shadow] duration-150 focus-within:border-blue-ink focus-within:shadow-[0_0_0_3px_rgb(35_70_160_/_0.12)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={4000}
            disabled={!!disabledReason}
            aria-label="Your question"
            placeholder={disabledReason ? '' : 'Ask a question'}
            className="min-h-0 flex-1 resize-none bg-transparent px-1.5 py-1 text-[15px] leading-6 text-ink outline-none placeholder:text-ink-3 disabled:opacity-45"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!canSend || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-ink text-white transition-colors duration-150 hover:bg-blue-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink disabled:pointer-events-none disabled:opacity-45"
          >
            <ArrowUp size={16} strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-3">Enter to send, Shift + Enter for a new line. Not saved after you leave</p>
      </form>
    </aside>
  )
}
