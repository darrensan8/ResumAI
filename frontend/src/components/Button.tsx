import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold ' +
  'transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const variants: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] ' +
    'shadow-[var(--shadow-glow)] hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0',
  ghost:
    'text-brand-700 bg-white/60 border border-white/70 backdrop-blur hover:bg-white/90',
}

export default function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
