import type { ReactNode } from 'react'

type PageShellProps = {
  children: ReactNode
  /** center the content vertically (used for the single-card upload screens) */
  centered?: boolean
}

/**
 * Full-height gradient backdrop with soft animated color blobs.
 * Wraps every page so the brand background is consistent.
 */
export default function PageShell({ children, centered = false }: PageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-200 via-blue-100 to-cyan-200">
      {/* decorative gradient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[30rem] w-[30rem] rounded-full bg-brand-500/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full bg-[var(--color-accent-cyan)]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-44 left-1/4 h-[32rem] w-[32rem] rounded-full bg-[var(--color-accent-sky)]/35 blur-3xl" />

      <div
        className={
          'relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-10 ' +
          (centered ? 'items-center justify-center' : '')
        }
      >
        {children}
      </div>
    </div>
  )
}
