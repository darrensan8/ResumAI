const STEPS = ['Resume', 'Job', 'Analysis']

/** Compact 3-step progress indicator. `current` is 0-based. */
export default function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {STEPS.map((label, i) => {
        const active = i === current
        const done = i < current
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={
                  'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ' +
                  (active
                    ? 'bg-brand-600 text-white'
                    : done
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-white/60 text-slate-400')
                }
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                className={
                  'text-xs font-medium ' +
                  (active ? 'text-brand-700' : 'text-slate-400')
                }
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="h-px w-6 bg-slate-300/70" />
            )}
          </div>
        )
      })}
    </div>
  )
}
