import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { mockAnalysis } from '../mocks/analysis'
import { authHeaders } from '../lib/auth'
import PageShell from '../components/PageShell'
import Button from '../components/Button'
import AnalysisView, { type AnalysisData } from '../components/AnalysisView'

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
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`)

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += value
    let end
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      const event = raw.match(/^event: (.*)$/m)?.[1]
      const data = JSON.parse(raw.match(/^data: (.*)$/m)?.[1] ?? '{}')
      if (event === 'section') onSection(data.key, data.value)
      else if (event === 'done') return
      else if (event === 'error') throw new Error(data.detail)
    }
  }
  throw new Error('Analysis stream ended early')
}

export default function Analysis() {
  const navigate = useNavigate()
  // Filled in section by section as the analysis streams in.
  const [analysis, setAnalysis] = useState<Partial<AnalysisData>>({})
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Dev-only: ?mock=1 renders fixture data with no backend/Claude call.
    if (new URLSearchParams(window.location.search).get('mock') === '1') {
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

  return (
    <PageShell width="wide">
      <AnalysisView
        analysis={analysis}
        streaming={streaming}
        actions={
          <>
            {/* Keeps the session's resume; only the job description is replaced. */}
            <Button onClick={() => navigate('/job-description')}>Analyze another job</Button>
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
    </PageShell>
  )
}
