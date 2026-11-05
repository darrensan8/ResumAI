import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type PageShellProps = {
  children: ReactNode
  /** Right side of the top bar, e.g. page actions */
  actions?: ReactNode
  /** 'narrow' for the upload steps, 'wide' for the report */
  width?: 'narrow' | 'wide'
}

/** Plain paper page with a quiet top bar. Wraps every route. */
export default function PageShell({ children, actions, width = 'narrow' }: PageShellProps) {
  const max = width === 'wide' ? 'max-w-[1200px]' : 'max-w-[1080px]'
  return (
    <div className="min-h-screen bg-desk">
      <header className="border-b border-line">
        <div className={`mx-auto flex h-14 items-center justify-between gap-4 px-4 sm:px-8 ${max}`}>
          <Link to="/" className="flex items-center gap-2 text-ink">
            <LogoMark />
            <span className="text-[17px] font-medium">ResumAI</span>
          </Link>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className={`mx-auto w-full px-4 py-8 sm:px-8 sm:py-12 ${max}`}>{children}</main>
    </div>
  )
}

/** A flat sheet of paper with one line struck in red pen. */
function LogoMark() {
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" aria-hidden="true">
      <rect x="1" y="1" width="16" height="18" rx="2.5" fill="var(--color-paper)" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 7h8M5 10.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4.5 14h9" stroke="var(--color-pen)" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
