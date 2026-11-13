import type { ReactNode } from 'react'
import PageShell from './PageShell'
import Stepper from './Stepper'

type StepLayoutProps = {
  step: number
  title: string
  lead: string
  /** Extra content under the lead on the left, e.g. a preview */
  aside?: ReactNode
  children: ReactNode
}

/** Upload steps: headline on the left, the working panel on the right. */
export default function StepLayout({ step, title, lead, aside, children }: StepLayoutProps) {
  return (
    <PageShell>
      <div className="grid items-center gap-10 lg:min-h-[calc(100vh-56px-96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <div className="animate-rise">
          <Stepper current={step} />
          <h1 className="mt-8 font-serif text-[40px] leading-[1.08] font-normal tracking-[-0.02em] text-ink sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-[34rem] text-lg leading-7 text-ink-2">{lead}</p>
          {aside && <div className="mt-10 hidden lg:block">{aside}</div>}
        </div>
        <div className="animate-rise [animation-delay:60ms]">{children}</div>
      </div>
    </PageShell>
  )
}
