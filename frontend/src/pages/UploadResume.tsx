import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../lib/api'
import PageShell from '../components/PageShell'
import GlassCard from '../components/GlassCard'
import Stepper from '../components/Stepper'

export default function UploadResume() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }

    setIsLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post(`${API_URL}/api/resume/upload-resume`, formData, {
        withCredentials: true,
      })
      localStorage.setItem('session_id', response.data.session_id)
      navigate('/job-description')
    } catch {
      setError('Failed to upload resume. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <PageShell centered>
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-brand-600 to-[var(--color-accent-cyan)] bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
            ResumAI
          </h1>
          <p className="mt-3 text-base text-slate-500">
            AI-powered resume analyzer for tech roles
          </p>
        </div>

        <div className="mb-6">
          <Stepper current={0} />
        </div>

        <GlassCard>
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={
              'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ' +
              (dragOver
                ? 'border-brand-500 bg-brand-50/60'
                : 'border-slate-300 hover:border-brand-400 hover:bg-white/40')
            }
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-[var(--color-accent-cyan)] text-2xl text-white shadow-[var(--shadow-glow)]">
              ↑
            </div>
            <p className="text-base font-medium text-slate-700">
              {isLoading ? 'Uploading…' : 'Drop your resume here'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              or <span className="font-semibold text-brand-600">browse files</span> · PDF only
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isLoading}
            />
          </label>

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
