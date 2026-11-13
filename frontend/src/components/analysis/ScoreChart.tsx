const LABELS: Record<string, string> = {
  experience_relevance: 'Experience relevance',
  technical_skills: 'Technical skills',
  impact_and_metrics: 'Impact and metrics',
  system_design_signals: 'System design signals',
  cs_fundamentals: 'CS fundamentals',
  project_quality: 'Project quality',
  structure_and_readability: 'Structure and readability',
  ats_compatibility: 'ATS compatibility',
  role_level_fit: 'Role level fit',
}

const labelFor = (key: string) => {
  const s = LABELS[key] ?? key.replace(/_/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Ranked dimensions on a shared 0–100 track. A dashed blue-ink line marks the
 * overall score; the three weakest areas below it are drawn in red pen, since
 * they pull the overall down most. Everything else stays ink-neutral.
 */
export default function ScoreChart({ scores, overall }: { scores: Record<string, number>; overall: number }) {
  const rows = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const weakest = new Set(
    rows
      .filter(([, v]) => v < overall)
      .slice(-3)
      .map(([k]) => k)
  )
  const below = weakest.size

  return (
    <figure className="m-0">
      <div className="grid grid-cols-[minmax(0,1fr)_32px] gap-x-4 sm:grid-cols-[200px_minmax(0,1fr)_32px]">
        {rows.map(([key, value], i) => {
          const short = weakest.has(key)
          return (
            <div key={key} className="contents">
              <span className="col-span-2 pt-3 text-sm text-ink-2 sm:col-span-1 sm:py-2">{labelFor(key)}</span>
              <div className="relative flex h-9 items-center sm:h-auto">
                <div className="h-1.5 w-full rounded-full bg-raised" />
                <div
                  className={'animate-grow absolute left-0 h-1.5 rounded-full ' + (short ? 'bg-pen' : 'bg-ink/70')}
                  style={{ width: `${value}%`, animationDelay: `${Math.min(i, 6) * 40}ms` }}
                />
                <div
                  className="absolute inset-y-0 border-l border-dashed border-blue-ink"
                  style={{ left: `${overall}%` }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={
                  'flex items-center justify-end text-sm tabular-nums ' + (short ? 'text-pen' : 'text-ink')
                }
              >
                {value}
              </span>
            </div>
          )
        })}

        {/* Axis */}
        <span className="hidden sm:block" />
        <div className="relative mt-2 h-5 text-xs tabular-nums text-ink-3">
          <span className="absolute left-0">0</span>
          <span className="absolute left-1/2 -translate-x-1/2">50</span>
          <span className="absolute right-0">100</span>
        </div>
        <span />
      </div>
      <figcaption className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-ink-2">
        <span className="flex items-center gap-2">
          <span className="h-3 border-l border-dashed border-blue-ink" aria-hidden="true" />
          Overall {overall}
        </span>
        {below > 0 && (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-3 rounded-full bg-pen" aria-hidden="true" />
            {below === 1 ? 'Weakest area' : `${below} weakest areas`}
          </span>
        )}
      </figcaption>
    </figure>
  )
}
