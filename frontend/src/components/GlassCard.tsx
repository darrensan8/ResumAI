import type { ReactNode } from 'react'

type GlassCardProps = {
  children: ReactNode
  className?: string
}

/** Frosted-glass surface used for every card/section. */
export default function GlassCard({ children, className = '' }: GlassCardProps) {
  return (
    <div
      className={
        'glass rounded-[var(--radius-glass)] p-7 sm:p-9 ' + className
      }
    >
      {children}
    </div>
  )
}
