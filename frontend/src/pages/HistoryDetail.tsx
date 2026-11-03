import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../lib/api'
import { authHeaders, useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Button from '../components/Button'
import AnalysisView, { type AnalysisData } from '../components/AnalysisView'

type HistoryEntry = {
  id: number
  created_at: string
  role_level: string
  job_description: string
  analysis_data: AnalysisData
}

export default function HistoryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, openAuthModal } = useAuth()
  const [entry, setEntry] = useState<HistoryEntry | null>(null)
  const [error, setError] = useState('')
  const [showJd, setShowJd] = useState(false)

  useEffect(() => {
    if (!user) return
    axios
      .get(`${API_URL}/api/history/${id}`, { headers: authHeaders() })
      .then((res) => setEntry(res.data))
      .catch((err) =>
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? 'This analysis could not be found.'
            : 'Could not load this analysis. Please try again.'
        )
      )
  }, [id, user])

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
              Past Feedback
            </h1>
            {entry && (
              <p className="mt-1 text-sm text-slate-500">
                {formatDate(entry.created_at)} · <span className="capitalize">{entry.role_level}</span> role
              </p>
            )}
          </div>
          <Button variant="ghost" onClick={() => navigate('/history')}>
            ← All Feedback
          </Button>
        </div>

        {!user ? (
          <GlassCard className="text-center">
            <p className="mb-5 text-base text-slate-600">Log in to see your past feedback.</p>
            <Button onClick={() => openAuthModal('login')}>Log in</Button>
          </GlassCard>
        ) : error ? (
          <GlassCard className="text-center text-base text-red-600">{error}</GlassCard>
        ) : !entry ? (
          <div className="flex justify-center py-10">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <GlassCard>
              <button
                onClick={() => setShowJd((s) => !s)}
                aria-expanded={showJd}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <h2 className="text-xl font-bold text-slate-800">Job Description</h2>
                <span className="text-sm font-semibold text-brand-600">{showJd ? 'Hide' : 'Show'}</span>
              </button>
              <p
                className={
                  'mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600 ' + (showJd ? '' : 'line-clamp-3')
                }
              >
                {entry.job_description}
              </p>
            </GlassCard>
            <AnalysisView analysis={entry.analysis_data} />
          </div>
        )}
      </div>
    </PageShell>
  )
}
