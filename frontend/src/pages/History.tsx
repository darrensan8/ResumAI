import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../lib/api'
import { authHeaders, useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Button from '../components/Button'

type HistoryItem = {
  id: number
  created_at: string
  role_level: string
  overall_score: number | null
  hiring_recommendation: string | null
  job_description_preview: string
}

const scoreColor = (v: number) =>
  v >= 70 ? 'text-emerald-600' : v >= 50 ? 'text-amber-600' : 'text-red-600'

export default function History() {
  const navigate = useNavigate()
  const { user, openAuthModal } = useAuth()
  const [items, setItems] = useState<HistoryItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    axios
      .get(`${API_URL}/api/history/`, { headers: authHeaders() })
      .then((res) => setItems(res.data))
      .catch(() => setError('Could not load your feedback history. Please try again.'))
  }, [user])

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            My Feedback
          </h1>
          <Button variant="ghost" onClick={() => navigate('/')}>
            New Analysis
          </Button>
        </div>

        {!user ? (
          <GlassCard className="text-center">
            <p className="mb-5 text-base text-slate-600">Log in to see your past feedback and job descriptions.</p>
            <Button onClick={() => openAuthModal('login')}>Log in</Button>
          </GlassCard>
        ) : error ? (
          <GlassCard className="text-center text-base text-red-600">{error}</GlassCard>
        ) : !items ? (
          <div className="flex justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <GlassCard className="text-center">
            <p className="mb-5 text-base text-slate-600">No analyses yet. Run one and it will show up here.</p>
            <Button onClick={() => navigate('/')}>Analyze a Resume</Button>
          </GlassCard>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/history/${item.id}`}
                  className="glass flex items-center gap-5 rounded-[var(--radius-glass)] p-5 transition hover:-translate-y-0.5 hover:bg-white/80 sm:p-6"
                >
                  {item.overall_score !== null && (
                    <div className="flex w-14 shrink-0 flex-col items-center">
                      <span className={'text-3xl font-extrabold ' + scoreColor(item.overall_score)}>
                        {item.overall_score}
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">/ 100</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-slate-500">{formatDate(item.created_at)}</span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium capitalize text-slate-500">
                        {item.role_level}
                      </span>
                      {item.hiring_recommendation && (
                        <span className="rounded-full bg-brand-50 px-2.5 py-0.5 font-bold uppercase text-brand-700">
                          {item.hiring_recommendation.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {item.job_description_preview}
                    </p>
                  </div>
                  <span className="text-xl text-slate-300">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  )
}
