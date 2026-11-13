import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import { API_URL } from '../lib/api'
import { authHeaders, useAuth } from '../lib/auth'
import { formatDate } from '../lib/format'
import PageShell from '../components/PageShell'
import Panel from '../components/Panel'
import Button from '../components/Button'
import AnalysisView, { Section, type AnalysisData } from '../components/AnalysisView'

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
            ? 'This review couldn’t be found'
            : 'Couldn’t load this review. Try again'
        )
      )
  }, [id, user])

  const back = (
    <Button variant="secondary" onClick={() => navigate('/history')}>
      <ArrowLeft size={16} strokeWidth={1.5} />
      All reviews
    </Button>
  )

  if (!user || error || !entry) {
    return (
      <PageShell>
        <Panel className="mx-auto max-w-[32rem] px-8 py-10 text-center">
          {!user ? (
            <>
              <p className="mb-6 text-[15px] text-ink-2">Log in to see your past reviews</p>
              <Button onClick={() => openAuthModal('login')}>Log in</Button>
            </>
          ) : error ? (
            <>
              <p role="alert" className="mb-6 text-[15px] text-pen">
                {error}
              </p>
              {back}
            </>
          ) : (
            <p className="text-[15px] text-ink-3">Loading this review</p>
          )}
        </Panel>
      </PageShell>
    )
  }

  return (
    <PageShell width="wide">
      <AnalysisView
        analysis={entry.analysis_data}
        meta={
          <>
            {formatDate(entry.created_at)} · <span className="capitalize">{entry.role_level}</span> role
          </>
        }
        actions={back}
        before={
          <Section
            id="job"
            title="Job description"
            first
            action={
              <button
                onClick={() => setShowJd((s) => !s)}
                aria-expanded={showJd}
                className="flex h-8 shrink-0 items-center rounded-md border border-line-strong px-3 text-sm text-ink-2 transition-colors duration-150 hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-blue-ink"
              >
                {showJd ? 'Hide' : 'Show all'}
              </button>
            }
          >
            <p className={'whitespace-pre-wrap text-[15px] leading-6 text-ink-2 ' + (showJd ? '' : 'line-clamp-3')}>
              {entry.job_description}
            </p>
          </Section>
        }
      />
    </PageShell>
  )
}
