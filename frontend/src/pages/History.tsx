import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { ChevronRight } from 'lucide-react'
import { API_URL } from '../lib/api'
import { authHeaders, useAuth } from '../lib/auth'
import { formatDate, RECOMMENDATION } from '../lib/format'
import PageShell from '../components/PageShell'
import Panel from '../components/Panel'
import Button from '../components/Button'

type HistoryItem = {
  id: number
  created_at: string
  role_level: string
  overall_score: number | null
  hiring_recommendation: string | null
  job_description_preview: string
}

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
      .catch(() => setError('Couldn’t load your past reviews. Try again'))
  }, [user])

  let body: ReactNode
  if (!user) {
    body = (
      <Notice>
        <p className="mb-6 text-[15px] text-ink-2">Log in to see your past reviews and the jobs they were scored against</p>
        <Button onClick={() => openAuthModal('login')}>Log in</Button>
      </Notice>
    )
  } else if (error) {
    body = (
      <Notice>
        <p role="alert" className="text-[15px] text-pen">
          {error}
        </p>
      </Notice>
    )
  } else if (!items) {
    body = (
      <Notice>
        <p className="text-[15px] text-ink-3">Loading your past reviews</p>
      </Notice>
    )
  } else if (items.length === 0) {
    body = (
      <Notice>
        <p className="mb-6 text-[15px] text-ink-2">No reviews yet. Each one you run while logged in is saved here</p>
        <Button onClick={() => navigate('/')}>Review a resume</Button>
      </Notice>
    )
  } else {
    body = (
      <ul className="m-0 list-none overflow-hidden rounded-2xl border border-line bg-paper p-0 shadow-[var(--shadow-sheet)]">
        {items.map((item, i) => {
          const reco = RECOMMENDATION[item.hiring_recommendation ?? '']
          return (
            <li key={item.id} className={'animate-rise ' + (i > 0 ? 'border-t border-line' : '')}>
              <Link
                to={`/history/${item.id}`}
                className="flex items-center gap-6 px-6 py-5 transition-colors duration-150 hover:bg-raised/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-ink"
              >
                <span className="w-12 shrink-0 font-serif text-[32px] leading-none tabular-nums text-ink">
                  {item.overall_score ?? '––'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-3">
                    <span>{formatDate(item.created_at)}</span>
                    <span className="capitalize">{item.role_level}</span>
                    {reco && (
                      <span className="flex items-center gap-2 text-ink-2">
                        <span className={'h-1.5 w-1.5 rounded-full ' + reco.dot} aria-hidden="true" />
                        {reco.label}
                      </span>
                    )}
                  </p>
                  <p className="line-clamp-2 text-[15px] leading-6 text-ink-2">{item.job_description_preview}</p>
                </div>
                <ChevronRight size={16} strokeWidth={1.5} className="shrink-0 text-ink-3" />
              </Link>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[48rem]">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-serif text-[40px] leading-[1.1] font-normal tracking-[-0.02em] text-ink">Past reviews</h1>
            {items && items.length > 0 && (
              <p className="mt-2 text-[15px] text-ink-3">
                {items.length} {items.length === 1 ? 'review' : 'reviews'}, newest first
              </p>
            )}
          </div>
          {user && (
            <Button variant="secondary" onClick={() => navigate('/')}>
              New review
            </Button>
          )}
        </div>
        {body}
      </div>
    </PageShell>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return <Panel className="px-8 py-10 text-center">{children}</Panel>
}
