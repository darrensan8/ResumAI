import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'quiet'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: Variant
}

const base =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium ' +
  'transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[.98] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-ink ' +
  'disabled:pointer-events-none disabled:opacity-45'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-ink text-white hover:bg-blue-ink-hover',
  secondary: 'border border-line-strong bg-paper text-ink hover:bg-raised',
  quiet: 'px-2 text-ink-2 hover:text-ink',
}

export default function Button({ children, variant = 'primary', className = '', ...rest }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
