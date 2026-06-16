import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../lib/api'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Stepper from '../components/Stepper'
import Button from '../components/Button'

const ROLE_LEVELS = ['intern', 'entry', 'mid', 'senior', 'staff', 'principal']

export default function UploadJobDescription() {
  const navigate = useNavigate()
  const [jobDescription, setJobDescription] = useState('')
  const [roleLevel, setRoleLevel] = useState('entry')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length
  const ready = wordCount >= 50 && !isLoading

  const handleSubmit = async () => {
    if (wordCount < 50) {
      setError('Job description must be at least 50 words.')
      return
    }

    setIsLoading(true)
    setError('')

    const sessionId = localStorage.getItem('session_id')

    try {
      await axios.post(
        `${API_URL}/api/job-description/upload-job-description`,
        { job_description: jobDescription },
        { withCredentials: true, headers: { 'X-Session-ID': sessionId } }
      )
      localStorage.setItem('role_level', roleLevel)
      navigate('/analysis')
    } catch {
      setError('Failed to upload job description. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageShell centered>
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            ResumAI
          </h1>
          <p className="mt-2 text-base text-slate-500">Paste the job description to compare against</p>
        </div>

        <div className="mb-6">
          <Stepper current={1} />
        </div>

        <GlassCard>
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-600">Target role level</label>
            <div className="flex flex-wrap gap-1.5">
              {ROLE_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setRoleLevel(level)}
                  className={
                    'rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ' +
                    (roleLevel === level
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'bg-white/70 text-slate-500 hover:bg-white')
                  }
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="h-72 w-full resize-y rounded-xl border border-white/70 bg-white/70 p-4 text-sm text-slate-700 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400"
            placeholder="Copy and paste the full job description here…"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <span
              className={
                'text-xs font-medium ' +
                (wordCount >= 50 ? 'text-emerald-600' : 'text-slate-400')
              }
            >
              {wordCount} / 50 words minimum
            </span>
            <Button onClick={handleSubmit} disabled={!ready}>
              {isLoading ? 'Analyzing…' : 'Analyze Resume →'}
            </Button>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}
        </GlassCard>
      </div>
    </PageShell>
  )
}
