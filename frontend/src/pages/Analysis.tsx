import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../lib/api'
import { mockAnalysis } from '../mocks/analysis'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Button from '../components/Button'
import Stepper from '../components/Stepper'

// The mock fixture mirrors the backend response, so it doubles as the type.
type AnalysisData = typeof mockAnalysis

const scoreColor = (v: number) =>
  v >= 70 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500'

const RECOMMENDATION_STYLES: Record<string, string> = {
  strong_yes: 'bg-emerald-100 text-emerald-700',
  yes: 'bg-emerald-100 text-emerald-700',
  maybe: 'bg-amber-100 text-amber-700',
  no: 'bg-red-100 text-red-700',
  strong_no: 'bg-red-100 text-red-700',
}

/**
 * POST to the streaming analysis endpoint and dispatch its server-sent events.
 * `section` events carry one finished field of the analysis ({ key, value }); a list that is
 * still being written (e.g. improvements) is re-sent as it grows.
 */
async function streamAnalysis(
  sessionId: string,
  roleLevel: string,
  signal: AbortSignal,
  onSection: (key: string, value: unknown) => void
) {
  const response = await fetch(`${API_URL}/api/analysis/analyze-stream`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId },
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

    const sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      navigate('/')
      return
    }
    const roleLevel = localStorage.getItem('role_level') || 'entry'
    const controller = new AbortController()

    streamAnalysis(sessionId, roleLevel, controller.signal, (key, value) =>
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

  const overall = analysis.overall_score ?? 0
  const recoKey = analysis.hiring_recommendation
  const readiness = analysis.interview_readiness

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
        {/* Overall score */}
        <GlassCard>
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
            <ScoreRing value={overall} />
            <div className="flex-1 text-center sm:text-left">
              <div className="mb-2 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <span className="text-sm font-medium text-slate-500">Hiring recommendation</span>
                <span
                  className={
                    'rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ' +
                    (RECOMMENDATION_STYLES[recoKey ?? ''] || 'bg-slate-100 text-slate-600')
                  }
                >
                  {recoKey?.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-base leading-relaxed text-slate-600">
                {analysis.recruiter_first_impression}
              </p>
              {analysis.hiring_recommendation_reason && (
                <p className="mt-3 border-t border-slate-200/70 pt-3 text-sm italic leading-relaxed text-slate-500">
                  {analysis.hiring_recommendation_reason}
                </p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Tailored summary */}
        {analysis.tailored_summary && (
          <GlassCard>
            <SectionTitle>Tailored Summary</SectionTitle>
            <p className="mb-3 text-sm text-slate-400">
              A job-tailored summary you can paste at the top of your resume.
            </p>
            <p className="rounded-2xl border border-white/70 bg-white/60 p-4 text-base leading-relaxed text-slate-700">
              {analysis.tailored_summary}
            </p>
          </GlassCard>
        )}

        {/* Score breakdown */}
        {analysis.scores && (
        <GlassCard>
          <SectionTitle>Score Breakdown</SectionTitle>
          <div className="flex flex-col gap-3.5">
            {Object.entries(analysis.scores).map(([key, value]) => (
              <div key={key} className="grid grid-cols-[9rem_1fr_2rem] items-center gap-3 sm:grid-cols-[12rem_1fr_2rem]">
                <span className="text-sm capitalize text-slate-500 sm:text-base">
                  {key.replace(/_/g, ' ')}
                </span>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200/70">
                  <div
                    className={'h-full rounded-full transition-all duration-500 ' + scoreColor(value as number)}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <span className="text-right text-sm font-semibold text-slate-600">{value as number}</span>
              </div>
            ))}
          </div>
        </GlassCard>
        )}

        {/* Strengths / weaknesses */}
        {analysis.strengths && (
        <div className="grid gap-8 md:grid-cols-2">
          <GlassCard>
            <SectionTitle>Strengths</SectionTitle>
            <ul className="flex flex-col gap-3">
              {analysis.strengths?.map((s: string, i: number) => (
                <Bullet key={i} tone="green">{s}</Bullet>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <SectionTitle>Weaknesses</SectionTitle>
            <ul className="flex flex-col gap-3">
              {analysis.weaknesses?.map((w: string, i: number) => (
                <Bullet key={i} tone="red">{w}</Bullet>
              ))}
            </ul>
          </GlassCard>
        </div>
        )}

        {/* Green / red flags */}
        {analysis.green_flags && (
        <div className="grid gap-8 md:grid-cols-2">
          <GlassCard>
            <SectionTitle>Green Flags</SectionTitle>
            <ul className="flex flex-col gap-3">
              {analysis.green_flags?.map((f: string, i: number) => (
                <Bullet key={i} tone="green" icon="▲">{f}</Bullet>
              ))}
            </ul>
          </GlassCard>
          <GlassCard>
            <SectionTitle>Red Flags</SectionTitle>
            <ul className="flex flex-col gap-3">
              {analysis.red_flags?.map((f: string, i: number) => (
                <Bullet key={i} tone="red" icon="▼">{f}</Bullet>
              ))}
            </ul>
          </GlassCard>
        </div>
        )}

        {/* Missing keywords */}
        {analysis.keyword_analysis && (
        <GlassCard>
          <SectionTitle>Missing Critical Keywords</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {analysis.keyword_analysis?.missing_critical_keywords?.map((k: string, i: number) => (
              <span key={i} className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-red-100">
                {k}
              </span>
            ))}
          </div>
        </GlassCard>
        )}

        {/* Tech-stack gaps */}
        {analysis.tech_stack_analysis && (
        <GlassCard>
          <SectionTitle>Tech Stack Gaps</SectionTitle>
          <p className="mb-4 text-sm text-slate-400">
            In the job description but missing from your resume.
          </p>
          <div className="flex flex-col gap-4">
            {[
              { label: 'Languages', items: analysis.tech_stack_analysis?.languages?.missing_from_jd },
              { label: 'Frameworks & Libraries', items: analysis.tech_stack_analysis?.frameworks_and_libraries?.missing_from_jd },
              { label: 'Tools & Platforms', items: analysis.tech_stack_analysis?.tools_and_platforms?.missing_from_jd },
            ].map(({ label, items }) =>
              items && items.length > 0 ? (
                <div key={label}>
                  <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
                  <div className="flex flex-wrap gap-2">
                    {items.map((t: string, i: number) => (
                      <span key={i} className="rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 ring-1 ring-red-100">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </GlassCard>
        )}

        {/* ATS breakdown */}
        {analysis.ats_analysis && (
        <GlassCard>
          <SectionTitle>ATS Breakdown</SectionTitle>
          <div className="mb-4 flex flex-wrap gap-3">
            <div
              className={
                'flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium ' +
                (analysis.ats_analysis?.keyword_density_ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')
              }
            >
              <span className="text-base">{analysis.ats_analysis?.keyword_density_ok ? '✓' : '✗'}</span>
              Keyword density
            </div>
          </div>
          {analysis.ats_analysis?.formatting_issues && analysis.ats_analysis.formatting_issues.length > 0 && (
            <div className="mb-4">
              <span className="mb-2 block text-sm font-semibold text-slate-500">Formatting issues</span>
              <ul className="flex flex-col gap-3">
                {analysis.ats_analysis.formatting_issues.map((issue: string, i: number) => (
                  <Bullet key={i} tone="red">{issue}</Bullet>
                ))}
              </ul>
            </div>
          )}
          {analysis.ats_analysis?.recommended_section_order && analysis.ats_analysis.recommended_section_order.length > 0 && (
            <div className="mb-4">
              <span className="mb-2 block text-sm font-semibold text-slate-500">Recommended section order</span>
              <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                {analysis.ats_analysis.recommended_section_order.map((section: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">{i + 1}. {section}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {analysis.ats_analysis?.file_format_notes && (
            <p className="border-t border-slate-200/70 pt-3 text-sm italic leading-relaxed text-slate-500">
              {analysis.ats_analysis.file_format_notes}
            </p>
          )}
        </GlassCard>
        )}

        {/* Interview readiness */}
        {readiness && (
        <GlassCard>
          <SectionTitle>Interview Readiness</SectionTitle>
          <div className="mb-4 flex flex-wrap gap-3">
            {[
              { label: 'Technical Screen', ok: readiness?.technical_screen_ready },
              { label: 'System Design', ok: readiness?.system_design_ready },
              { label: 'Behavioral', ok: readiness?.behavioral_ready },
            ].map(({ label, ok }) => (
              <div
                key={label}
                className={
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-base font-medium ' +
                  (ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')
                }
              >
                <span className="text-base">{ok ? '✓' : '✗'}</span>
                {label}
              </div>
            ))}
          </div>
          {readiness?.notes && (
            <p className="border-t border-slate-200/70 pt-3 text-sm italic leading-relaxed text-slate-500">
              {readiness.notes}
            </p>
          )}
        </GlassCard>
        )}

        {/* Improvements */}
        {analysis.improvements && analysis.improvements.length > 0 && (
        <GlassCard>
          <SectionTitle>Improvements</SectionTitle>
          <div className="flex flex-col gap-3">
            {analysis.improvements?.map((imp, i: number) => (
              <div key={i} className="rounded-2xl border border-white/70 bg-white/60 p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <PriorityBadge priority={imp.priority} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    {imp.category}
                  </span>
                </div>
                <p className="text-base leading-relaxed text-slate-700">{imp.suggestion}</p>
                {imp.reference_text && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-500">
                    "{imp.reference_text}"
                  </p>
                )}
                {imp.example_rewrite && (
                  <p className="mt-2 text-sm leading-relaxed text-brand-600">→ {imp.example_rewrite}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
        )}

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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-5 text-xl font-bold text-slate-800">{children}</h2>
}

function Bullet({
  children,
  tone,
  icon,
}: {
  children: React.ReactNode
  tone: 'green' | 'red'
  icon?: string
}) {
  const color = tone === 'green' ? 'text-emerald-500' : 'text-red-500'
  const mark = icon ?? (tone === 'green' ? '✓' : '✗')
  return (
    <li className="flex gap-2 text-base leading-relaxed text-slate-600">
      <span className={'font-bold ' + color}>{mark}</span>
      <span>{children}</span>
    </li>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ' + (styles[priority] || 'bg-slate-100 text-slate-600')}>
      {priority}
    </span>
  )
}

function ScoreRing({ value }: { value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div
      className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
      style={{ background: `conic-gradient(${color} ${value * 3.6}deg, #e2e8f0 0deg)` }}
    >
      <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
        <span className="text-3xl font-extrabold text-slate-800">{value}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">/ 100</span>
      </div>
    </div>
  )
}
