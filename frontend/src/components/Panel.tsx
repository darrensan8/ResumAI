import type { ReactNode } from 'react'

type PanelProps = {
  children: ReactNode
  className?: string
}

/** A sheet of paper on the desk: hairline edge, soft neutral shadow. */
export default function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={'rounded-2xl border border-line bg-paper p-6 shadow-[var(--shadow-sheet)] ' + className}>
      {children}
    </div>
  )
}
