import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Copy, Minus } from 'lucide-react'
import { API_URL } from '../lib/api'
import { mockAnalysis } from '../mocks/analysis'
import PageShell from '../components/PageShell'
import Button from '../components/Button'
import ScoreChart from '../components/analysis/ScoreChart'
import Ledger from '../components/analysis/Ledger'
import Redline from '../components/analysis/Redline'
import SectionIndex, { type IndexEntry } from '../components/analysis/SectionIndex'

// The mock fixture mirrors the backend response, so it doubles as the type.
type AnalysisData = typeof mockAnalysis
type Improvement = AnalysisData['improvements'][number]

const RECOMMENDATION: Record<string, { label: string; dot: string }> = {
  strong_yes: { label: 'Strong yes', dot: 'bg-moss' },
  yes: { label: 'Yes', dot: 'bg-moss' },
  maybe: { label: 'Maybe', dot: 'bg-ochre' },
  no: { label: 'No', dot: 'bg-pen' },
  strong_no: { label: 'Strong no', dot: 'bg-pen' },
}

const PRIORITIES = [
  { key: 'high', label: 'High priority' },
  { key: 'medium', label: 'Medium priority' },
  { key: 'low', label: 'Low priority' },
]

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

  const a = analysis
  const streaming = !isDone && !error

  const has = {
    verdict: a.recruiter_first_impression !== undefined,
    summary: a.tailored_summary !== undefined,
    scores: a.scores !== undefined,
    ledger: a.strengths !== undefined,
    missing: a.keyword_analysis !== undefined,
    ats: a.ats_analysis !== undefined,
    readiness: a.interview_readiness !== undefined,
    improvements: (a.improvements?.length ?? 0) > 0,
  }

  const index: IndexEntry[] = [
    { id: 'verdict', label: 'Recruiter’s read', ready: a.hiring_recommendation_reason !== undefined },
    { id: 'summary', label: 'Tailored summary', ready: has.summary },
    { id: 'scores', label: 'Score breakdown', ready: has.scores },
    { id: 'ledger', label: 'For and against', ready: a.red_flags !== undefined },
    { id: 'missing', label: 'Missing from your resume', ready: a.tech_stack_analysis !== undefined },
    { id: 'ats', label: 'ATS check', ready: has.ats },
    { id: 'readiness', label: 'Interview readiness', ready: has.readiness },
    { id: 'improvements', label: 'Line edits', ready: isDone && has.improvements },
  ]

  return (
    <PageShell width="wide">
      <div className="grid gap-8 lg:grid-cols-[256px_minmax(0,1fr)] lg:gap-12">
        <Rail
          analysis={a}
          index={index}
          streaming={streaming}
          onAnotherJob={() => navigate('/job-description')}
          onRestart={restart}
        />

        <article className="min-w-0 rounded-2xl border border-line bg-paper shadow-[var(--shadow-sheet)]">
          {!has.verdict && !error && (
            <div className="px-6 py-16 sm:px-10">
              <p className="font-serif text-2xl text-ink">Reading your resume against the job</p>
              <p className="mt-2 text-[15px] text-ink-2">
                The score lands first, then each section as it’s written
              </p>
            </div>
          )}

          {has.verdict && (
            <Section id="verdict" title="Recruiter’s read" first>
              <p className="font-serif text-[22px] leading-[1.45] text-ink">{a.recruiter_first_impression}</p>
              {a.hiring_recommendation_reason && (
                <p className="mt-4 max-w-[44rem] text-[15px] leading-6 text-ink-2">{a.hiring_recommendation_reason}</p>
              )}
            </Section>
          )}

          {has.summary && (
            <Section
              id="summary"
              title="Tailored summary"
              note="Written for this job. Paste it at the top of your resume"
              action={<CopyButton text={a.tailored_summary!} />}
            >
              <p className="rounded-lg bg-raised px-5 py-4 text-[15px] leading-[26px] text-ink">{a.tailored_summary}</p>
            </Section>
          )}

          {has.scores && (
            <Section id="scores" title="Score breakdown" note="Nine dimensions, highest first">
              <ScoreChart scores={a.scores as Record<string, number>} overall={a.overall_score ?? 0} />
            </Section>
          )}

          {has.ledger && (
            <Section id="ledger" title="For and against">
              <Ledger
                forYou={{ items: a.strengths, flags: a.green_flags }}
                against={{ items: a.weaknesses, flags: a.red_flags }}
              />
            </Section>
          )}

          {has.missing && <MissingSection analysis={a} />}

          {has.ats && <AtsSection ats={a.ats_analysis!} />}

          {has.readiness && <ReadinessSection readiness={a.interview_readiness!} />}

          {has.improvements && <Improvements items={a.improvements!} />}

          {(error || streaming) && has.verdict && (
            <div className="border-t border-line px-6 py-6 text-sm sm:px-10">
              {error ? (
                <ErrorLine error={error} onRestart={restart} />
              ) : (
                <p className="flex items-center gap-2 text-ink-3">
                  <span className="animate-live h-1.5 w-1.5 rounded-full bg-blue-ink" aria-hidden="true" />
                  Still writing the rest of the review
                </p>
              )}
            </div>
          )}

          {error && !has.verdict && (
            <div className="px-6 py-16 sm:px-10">
              <ErrorLine error={error} onRestart={restart} />
            </div>
          )}
        </article>
      </div>
    </PageShell>
  )
}

/* ─── Rail ─────────────────────────────────────────────────────────────── */

function Rail({
  analysis,
  index,
  streaming,
  onAnotherJob,
  onRestart,
}: {
  analysis: Partial<AnalysisData>
  index: IndexEntry[]
  streaming: boolean
  onAnotherJob: () => void
  onRestart: () => void
}) {
  const reco = RECOMMENDATION[analysis.hiring_recommendation ?? '']
  const hasScore = analysis.overall_score !== undefined

  return (
    <aside className="lg:sticky lg:top-8 lg:self-start">
      <div className="flex items-end justify-between gap-6 lg:block">
        <div>
          <p className="text-sm text-ink-2">Overall</p>
          <p className="mt-1 flex items-baseline gap-1 font-serif tabular-nums">
            <span className={'text-[64px] leading-none ' + (hasScore ? 'animate-rise text-ink' : 'text-ink-3/40')}>
              {hasScore ? analysis.overall_score : '––'}
            </span>
            <span className="text-xl text-ink-3">/100</span>
          </p>
        </div>
        <p className="flex items-center gap-2 pb-2 text-[15px] text-ink lg:mt-4 lg:pb-0">
          {reco ? (
            <>
              <span className={'h-2 w-2 rounded-full ' + reco.dot} aria-hidden="true" />
              <span>
                <span className="text-ink-2">Recommend:</span> {reco.label}
              </span>
            </>
          ) : (
            <span className="text-ink-3">Recommendation pending</span>
          )}
        </p>
      </div>

      <div className="mt-8 hidden border-t border-line pt-4 lg:block">
        <SectionIndex entries={index} streaming={streaming} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-6 lg:flex-col lg:items-stretch">
        <Button onClick={onAnotherJob}>Analyze another job</Button>
        <Button variant="quiet" onClick={onRestart}>
          Upload a new resume
        </Button>
      </div>
    </aside>
  )
}

/* ─── Report sections ──────────────────────────────────────────────────── */

function Section({
  id,
  title,
  note,
  action,
  first = false,
  children,
}: {
  id: string
  title: string
  note?: string
  action?: ReactNode
  first?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className={'animate-rise scroll-mt-8 px-6 py-8 sm:px-10 sm:py-10 ' + (first ? '' : 'border-t border-line')}
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-lg font-medium text-ink">{title}</h2>
          {note && <p className="mt-1 text-sm text-ink-3">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }
      className="flex h-8 shrink-0 items-center gap-2 rounded-md border border-line-strong px-3 text-sm text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink"
    >
      {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function MissingSection({ analysis: a }: { analysis: Partial<AnalysisData> }) {
  const critical = a.keyword_analysis?.missing_critical_keywords ?? []
  const seen = new Set(critical.map((k) => k.toLowerCase()))
  const fresh = (items?: string[]) => (items ?? []).filter((t) => !seen.has(t.toLowerCase()))
  const tech = a.tech_stack_analysis

  const rows = [
    { label: 'Critical keywords', items: critical },
    { label: 'Languages', items: fresh(tech?.languages?.missing_from_jd) },
    { label: 'Frameworks and libraries', items: fresh(tech?.frameworks_and_libraries?.missing_from_jd) },
    { label: 'Tools and platforms', items: fresh(tech?.tools_and_platforms?.missing_from_jd) },
  ].filter((r) => r.items.length > 0)

  return (
    <Section id="missing" title="Missing from your resume" note="In the job description, not on your resume">
      {rows.length === 0 ? (
        <p className="text-[15px] text-ink-2">Nothing important is missing</p>
      ) : (
        <dl className="m-0 flex flex-col">
          {rows.map((r, i) => (
            <div
              key={r.label}
              className={
                'grid gap-2 py-3 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4 ' + (i > 0 ? 'border-t border-line' : '')
              }
            >
              <dt className="pt-1 text-sm text-ink-2">{r.label}</dt>
              <dd className="m-0 flex flex-wrap gap-2">
                {r.items.map((t) => (
                  <span key={t} className="rounded-md bg-raised px-2 py-1 text-sm text-ink">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  )
}

function AtsSection({ ats }: { ats: AnalysisData['ats_analysis'] }) {
  const issues = ats.formatting_issues ?? []
  const order = ats.recommended_section_order ?? []
  return (
    <Section id="ats" title="ATS check" note="How applicant tracking software will parse the file">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_220px] md:gap-12">
        <div>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            <StatusRow ok={ats.keyword_density_ok}>
              Keyword density {ats.keyword_density_ok ? 'is in range' : 'needs work for this posting'}
            </StatusRow>
            {issues.map((issue, i) => (
              <StatusRow key={i} ok={false}>
                {issue}
              </StatusRow>
            ))}
          </ul>
          {ats.file_format_notes && (
            <p className="mt-6 text-sm leading-[22px] text-ink-2">{ats.file_format_notes}</p>
          )}
        </div>

        {order.length > 0 && (
          <div>
            <p className="mb-3 text-sm text-ink-2">Recommended section order</p>
            <ol className="m-0 flex list-none flex-col gap-3 rounded-xl border border-line bg-desk p-4">
              {order.map((s, i) => (
                <li key={i} className="flex flex-col gap-1">
                  <span className="flex items-baseline gap-2 text-sm text-ink">
                    <span className="w-4 tabular-nums text-ink-3">{i + 1}</span>
                    {s}
                  </span>
                  <span className="ml-6 h-1 rounded-full bg-line-strong" style={{ width: `${88 - (i % 3) * 18}%` }} />
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Section>
  )
}

function ReadinessSection({ readiness }: { readiness: AnalysisData['interview_readiness'] }) {
  const rows = [
    { label: 'Technical screen', ok: readiness.technical_screen_ready },
    { label: 'System design', ok: readiness.system_design_ready },
    { label: 'Behavioral', ok: readiness.behavioral_ready },
  ]
  return (
    <Section id="readiness" title="Interview readiness" note="Based on what the resume shows">
      <dl className="m-0 grid max-w-[32rem] grid-cols-[minmax(0,1fr)_auto]">
        {rows.map((r, i) => (
          <div key={r.label} className={'contents'}>
            <dt className={'py-3 text-[15px] text-ink ' + (i > 0 ? 'border-t border-line' : '')}>{r.label}</dt>
            <dd
              className={
                'm-0 flex items-center justify-end gap-2 py-3 text-sm ' +
                (r.ok ? 'text-moss' : 'text-pen') +
                (i > 0 ? ' border-t border-line' : '')
              }
            >
              {r.ok ? <Check size={16} strokeWidth={1.5} /> : <Minus size={16} strokeWidth={1.5} />}
              {r.ok ? 'Ready' : 'Not yet'}
            </dd>
          </div>
        ))}
      </dl>
      {readiness.notes && <p className="mt-4 max-w-[44rem] text-[15px] leading-6 text-ink-2">{readiness.notes}</p>}
    </Section>
  )
}

function Improvements({ items }: { items: Improvement[] }) {
  return (
    <Section id="improvements" title="Line edits" note="What to change, most important first">
      <div className="flex flex-col gap-10">
        {PRIORITIES.map(({ key, label }) => {
          const group = items.filter((imp) => imp.priority === key)
          if (group.length === 0) return null
          return (
            <div key={key}>
              <h3 className="mb-2 flex items-baseline gap-2 text-[15px] font-medium text-ink">
                {label}
                <span className="text-sm font-normal tabular-nums text-ink-3">{group.length}</span>
              </h3>
              <ol className="m-0 flex list-none flex-col p-0">
                {group.map((imp, i) => (
                  <li key={i} className="animate-rise flex flex-col gap-3 border-t border-line py-5">
                    <p className="text-[13px] text-ink-3">{imp.category}</p>
                    <p className="-mt-1 text-[15px] leading-6 text-ink">{imp.suggestion}</p>
                    <Redline original={imp.reference_text || undefined} rewrite={imp.example_rewrite || undefined} />
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

/* ─── Small pieces ─────────────────────────────────────────────────────── */

function StatusRow({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[15px] leading-6 text-ink-2">
      {ok ? (
        <Check size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-moss" aria-label="Pass" />
      ) : (
        <Minus size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-pen" aria-label="Issue" />
      )}
      <span>{children}</span>
    </li>
  )
}

function ErrorLine({ error, onRestart }: { error: string; onRestart: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p role="alert" className="text-[15px] text-pen">
        {error}
      </p>
      <Button variant="secondary" onClick={onRestart}>
        Start over
      </Button>
    </div>
  )
}
