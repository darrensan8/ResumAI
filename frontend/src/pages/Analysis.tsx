import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { mockAnalysis } from '../mocks/analysis'
import { authHeaders } from '../lib/auth'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Button from '../components/Button'
import Stepper from '../components/Stepper'
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
  const [analysis, setAnalysis] = useState<Partial<AnalysisData> | null>(null)
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
        if (!controller.signal.aborted) setError('Failed to analyze resume. Please try again.')
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

  // The headline card needs the score, which is the first field streamed.
  const hasHeadline = analysis?.overall_score !== undefined

  if (error && !hasHeadline) {
    return (
      <PageShell centered>
        <GlassCard className="text-center">
          <p className="mb-5 text-base text-red-600">{error}</p>
          <Button onClick={restart}>Start Over</Button>
        </GlassCard>
      </PageShell>
    )
  }

  if (!analysis || !hasHeadline) {
    return (
      <PageShell centered>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="text-lg font-semibold text-slate-700">Analyzing your resume…</p>
          <p className="text-sm text-slate-400">Your score will appear in a few seconds</p>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            ResumAI
          </h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={restart}>
              Upload New Resume
            </Button>
            {/* Keeps the session's resume; only the job description is replaced. */}
            <Button variant="ghost" onClick={() => navigate('/job-description')}>
              Analyze Another Job Description
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <Stepper current={2} />
        </div>

        <div className="flex flex-col gap-8">
        <AnalysisView analysis={analysis} />

        {/* Streaming status */}
        {error ? (
          <p className="text-center text-base text-red-600">{error}</p>
        ) : (
          !isDone && (
            <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Still analyzing…
            </div>
          )
        )}
        </div>
      </div>
    </PageShell>
  )
}
