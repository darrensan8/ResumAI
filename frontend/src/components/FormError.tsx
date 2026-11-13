import { CircleAlert } from 'lucide-react'

/** Inline error, written in red pen. */
export default function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-pen">
      <CircleAlert size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}
