import { Check } from 'lucide-react'

const STEPS = ['Resume', 'Job', 'Review']

/** Quiet three-step progress line. `current` is 0-based. */
export default function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <li
            key={label}
            aria-current={active ? 'step' : undefined}
            className={'flex items-center gap-2 ' + (active ? 'text-ink' : done ? 'text-ink-2' : 'text-ink-3')}
          >
            <span className="flex w-4 justify-center tabular-nums">
              {done ? <Check size={16} strokeWidth={1.5} /> : i + 1}
            </span>
            <span className={active ? 'font-medium' : ''}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}
