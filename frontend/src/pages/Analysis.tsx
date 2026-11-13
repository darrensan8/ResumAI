import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { API_URL } from '../lib/api'
import { mockAnalysis } from '../mocks/analysis'
import { authHeaders } from '../lib/auth'
import { readSSE } from '../lib/sse'
import PageShell from '../components/PageShell'
import Button from '../components/Button'
import AnalysisView, { type AnalysisData } from '../components/AnalysisView'
import ChatPanel from '../components/ChatPanel'

/**
 * POST to the streaming analysis endpoint and dispatch its server-sent events.
 * `section` events carry one finished field of the analysis ({ key, value }); a list that is
 * still being written (e.g. improvements) is re-sent as it grows.
 */
async function streamAnalysis(
  roleLevel: string,
  signal: AbortSignal,
  onSection: (key: string, value: unknown) => void
) {
  const response = await fetch(`${API_URL}/api/analysis/analyze-stream`, {
    method: 'POST',
    credentials: 'include',
    // authHeaders() adds the login token, so logged-in runs are saved to the account's history.
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ role_level: roleLevel }),
    signal,
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)

  const finished = await readSSE(response, (event, data) => {
    if (event === 'section') onSection(data.key, data.value)
    else if (event === 'done') return 'stop'
    else if (event === 'error') throw new Error(data.detail)
  })
  if (!finished) throw new Error('Analysis stream ended early')
}

export default function Analysis() {
  const navigate = useNavigate()
  // Filled in section by section as the analysis streams in.
  const [analysis, setAnalysis] = useState<Partial<AnalysisData>>({})
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  // Dev-only: ?mock=1 renders fixture data with no backend/Claude call.
  const isMock = new URLSearchParams(window.location.search).get('mock') === '1'

  useEffect(() => {
    if (isMock) {
      setAnalysis(mockAnalysis)
      setIsDone(true)
      return
    }

    if (!localStorage.getItem('session_id')) {
      navigate('/')
      return
    }
    const roleLevel = localStorage.getItem('role_level') || 'entry'
    const controller = new AbortController()

    streamAnalysis(roleLevel, controller.signal, (key, value) =>
      setAnalysis((prev) => ({ ...prev, [key]: value }))
    )
      .then(() => setIsDone(true))
      .catch(() => {
        if (!controller.signal.aborted) setError('The review stopped before it finished. Start over to try again')
      })

    // Aborting cancels the backend's Claude call too (e.g. StrictMode's double-mounted effect).
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restart = () => {
    document.cookie = 'session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    localStorage.removeItem('session_id')
    localStorage.removeItem('role_level')
    navigate('/')
  }

  const streaming = !isDone && !error
  const started = analysis.recruiter_first_impression !== undefined

  // The chat backend reads the saved analysis, which only exists once the stream is done.
  const chatDisabledReason = isMock
    ? 'Questions are off in the sample review'
    : error
      ? 'Questions need a finished review'
      : !isDone
        ? 'You can ask questions once the review finishes'
        : undefined

  return (
    <PageShell width="wide">
      <AnalysisView
        analysis={analysis}
        streaming={streaming}
        actions={
          <>
            {/* Keeps the session's resume; only the job description is replaced. */}
            <Button onClick={() => navigate('/job-description')}>Analyze another job</Button>
            <Button variant="secondary" onClick={() => setChatOpen(true)} aria-expanded={chatOpen}>
              <MessageSquare size={16} strokeWidth={1.5} />
              Ask about this review
            </Button>
            <Button variant="quiet" onClick={restart}>
              Upload a new resume
            </Button>
          </>
        }
        placeholder={
          !error && (
            <div className="px-6 py-16 sm:px-10">
              <p className="font-serif text-2xl text-ink">Reading your resume against the job</p>
              <p className="mt-2 text-[15px] text-ink-2">The score lands first, then each section as it’s written</p>
            </div>
          )
        }
        footer={
          error ? (
            <div className={'px-6 sm:px-10 ' + (started ? 'border-t border-line py-6' : 'py-16')}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p role="alert" className="text-[15px] text-pen">
                  {error}
                </p>
                <Button variant="secondary" onClick={restart}>
                  Start over
                </Button>
              </div>
            </div>
          ) : (
            streaming &&
            started && (
              <p className="flex items-center gap-2 border-t border-line px-6 py-6 text-sm text-ink-3 sm:px-10">
                <span className="animate-live h-1.5 w-1.5 rounded-full bg-blue-ink" aria-hidden="true" />
                Still writing the rest of the review
              </p>
            )
          )
        }
      />

      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} disabledReason={chatDisabledReason} />

      {/* On small screens the rail's buttons scroll away, so keep a way back to the chat. */}
      {!chatOpen && isDone && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-30 inline-flex h-11 items-center gap-2 rounded-full bg-blue-ink px-4 text-sm font-medium text-white shadow-[0_8px_24px_rgb(31_27_22_/_0.18)] transition-colors duration-150 hover:bg-blue-ink-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink lg:hidden"
        >
          <MessageSquare size={16} strokeWidth={1.5} />
          Ask about this review
        </button>
      )}
    </PageShell>
  )
}
