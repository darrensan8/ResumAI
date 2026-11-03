import { useEffect, useState, type FormEvent } from 'react'
import axios from 'axios'
import { useAuth, type AuthView } from '../lib/auth'
import { PASSWORD_RULES, isStrongPassword } from '../lib/password'
import Button from './Button'

type AuthModalProps = {
  view: AuthView
  onViewChange: (view: AuthView) => void
  onClose: () => void
}

const BENEFITS = [
  { title: 'Save every analysis', body: 'Each run is stored automatically, so nothing is lost when you close the tab.' },
  { title: 'Feedback next to the job description', body: 'Revisit any past feedback alongside the exact JD it was scored against.' },
  { title: 'Track your progress', body: 'Compare scores across resume versions and roles over time.' },
  { title: 'Pick up anywhere', body: 'Log in from any device to see your full history.' },
]

const inputClass =
  'w-full rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-700 outline-none ' +
  'transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400'

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail?.message) return detail.message
    if (Array.isArray(detail)) return 'Please enter a valid email address.'
  }
  return 'Something went wrong. Please try again.'
}

export default function AuthModal({ view, onViewChange, onClose }: AuthModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="glass relative max-h-full w-full max-w-md overflow-y-auto rounded-[var(--radius-glass)] bg-white/80 p-7 sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full px-2 text-xl leading-none text-slate-400 hover:text-slate-600"
        >
          ×
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
      <h2 className="mb-1 pr-6 text-2xl font-extrabold text-slate-800">Welcome to ResumAI</h2>
      <p className="mb-5 text-sm text-slate-500">
        You can use ResumAI without an account. Log in to get more out of it:
      </p>
      <ul className="mb-6 flex flex-col gap-3">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex gap-3">
            <span className="mt-0.5 font-bold text-emerald-500">✓</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">{b.title}</p>
              <p className="text-sm text-slate-500">{b.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Button onClick={() => onViewChange('signup')}>Create account</Button>
        <Button variant="ghost" onClick={() => onViewChange('login')}>
          Log in
        </Button>
        <button onClick={onSkip} className="mt-1 text-sm font-medium text-slate-400 hover:text-slate-600">
          Skip for now
        </button>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="pr-6 text-2xl font-extrabold text-slate-800">{isSignup ? 'Create your account' : 'Log in'}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {isSignup ? 'Save your feedback and job descriptions.' : 'See your past feedback and job descriptions.'}
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-slate-600">Email</span>
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

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-slate-600">Password</span>
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
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {PASSWORD_RULES.map((rule) => {
            const ok = rule.test(password)
            return (
              <li key={rule.label} className={'flex gap-2 text-xs ' + (ok ? 'text-emerald-600' : 'text-slate-400')}>
                <span className="font-bold">{ok ? '✓' : '✗'}</span>
                {rule.label}
              </li>
            )
          })}
        </ul>
      )}

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!canSubmit}>
        {isLoading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
      </Button>

      <p className="text-center text-sm text-slate-500">
        {isSignup ? 'Already have an account? ' : 'New to ResumAI? '}
        <button
          type="button"
          onClick={() => onViewChange(isSignup ? 'login' : 'signup')}
          className="font-semibold text-brand-600 hover:underline"
        >
          {isSignup ? 'Log in' : 'Create an account'}
        </button>
      </p>
    </form>
  )
}
