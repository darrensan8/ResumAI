import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { Check, Minus, X } from 'lucide-react'
import { useAuth, type AuthView } from '../lib/auth'
import { PASSWORD_RULES, isStrongPassword } from '../lib/password'
import Button from './Button'
import FormError from './FormError'

type AuthModalProps = {
  view: AuthView
  onViewChange: (view: AuthView) => void
  onClose: () => void
}

const BENEFITS = [
  { title: 'Every review is saved', body: 'Each run is stored as it finishes, so nothing is lost when you close the tab' },
  { title: 'Feedback beside the job', body: 'Reopen any review next to the exact job description it was scored against' },
  { title: 'Scores over time', body: 'See how your score moves across resume versions and roles' },
  { title: 'Any device', body: 'Log in anywhere to see your full history' },
]

const inputClass =
  'h-10 w-full rounded-lg border border-line-strong bg-paper px-3 text-[15px] text-ink outline-none ' +
  'transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 ' +
  'focus:border-blue-ink focus:shadow-[0_0_0_3px_rgb(35_70_160_/_0.12)]'

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail.replace(/\.$/, '')
    if (detail?.message) return String(detail.message).replace(/\.$/, '')
    if (Array.isArray(detail)) return 'Enter a valid email address'
  }
  return 'Something went wrong. Try again'
}

export default function AuthModal({ view, onViewChange, onClose }: AuthModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 py-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        className="animate-rise relative max-h-full w-full max-w-[28rem] overflow-y-auto rounded-2xl border border-line bg-paper p-8 shadow-[0_16px_48px_rgb(31_27_22_/_0.16)]"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        {view === 'welcome' ? (
          <Welcome onViewChange={onViewChange} onSkip={onClose} />
        ) : (
          <CredentialsForm key={view} mode={view} onViewChange={onViewChange} />
        )}
      </div>
    </div>
  )
}

function Welcome({ onViewChange, onSkip }: { onViewChange: (v: AuthView) => void; onSkip: () => void }) {
  return (
    <>
      <h2 id="auth-title" className="pr-8 font-serif text-[28px] leading-[1.15] font-normal text-ink">
        Keep every review
      </h2>
      <p className="mt-2 mb-6 text-[15px] leading-6 text-ink-2">
        ResumAI works without an account. With one, you also get
      </p>
      <ul className="m-0 mb-8 flex list-none flex-col gap-4 p-0">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3">
            <Check size={16} strokeWidth={1.5} className="mt-1 shrink-0 text-ink-3" />
            <div>
              <p className="text-[15px] font-medium text-ink">{b.title}</p>
              <p className="text-sm leading-[22px] text-ink-2">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Button onClick={() => onViewChange('signup')}>Create account</Button>
        <Button variant="secondary" onClick={() => onViewChange('login')}>
          Log in
        </Button>
        <Button variant="quiet" onClick={onSkip}>
          Skip for now
        </Button>
      </div>
    </>
  )
}

function CredentialsForm({ mode, onViewChange }: { mode: 'login' | 'signup'; onViewChange: (v: AuthView) => void }) {
  const { login, signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isSignup = mode === 'signup'
  const canSubmit = !!email && !!password && (!isSignup || isStrongPassword(password)) && !isLoading

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setIsLoading(true)
    setError('')
    try {
      await (isSignup ? signup : login)(email.trim(), password)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <h2 id="auth-title" className="pr-8 font-serif text-[28px] leading-[1.15] font-normal text-ink">
          {isSignup ? 'Create your account' : 'Log in'}
        </h2>
        <p className="mt-2 text-[15px] text-ink-2">
          {isSignup ? 'Save your reviews and the jobs they were scored against' : 'Pick up your past reviews'}
        </p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-ink-2">Email</span>
        <input
          type="email"
          autoComplete="email"
          autoFocus
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm text-ink-2">Password</span>
        <input
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          maxLength={72}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {isSignup && (
        <ul className="m-0 -mt-1 grid list-none gap-2 p-0 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password)
            return (
              <li
                key={rule.label}
                className={'flex items-center gap-2 text-[13px] ' + (ok ? 'text-moss' : 'text-ink-3')}
              >
                {ok ? <Check size={14} strokeWidth={1.5} /> : <Minus size={14} strokeWidth={1.5} />}
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}

      {error && <FormError>{error}</FormError>}

      <Button type="submit" disabled={!canSubmit}>
        {isLoading ? 'One moment…' : isSignup ? 'Create account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-ink-2">
        {isSignup ? 'Already have an account? ' : 'New to ResumAI? '}
        <button
          type="button"
          onClick={() => onViewChange(isSignup ? 'login' : 'signup')}
          className="text-blue-ink underline decoration-blue-ink/30 underline-offset-4 hover:decoration-blue-ink"
        >
          {isSignup ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </form>
  )
}
