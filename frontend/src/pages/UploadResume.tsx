import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FileUp } from 'lucide-react'
import { API_URL } from '../lib/api'
import StepLayout from '../components/StepLayout'
import Panel from '../components/Panel'
import FormError from '../components/FormError'
import Redline from '../components/analysis/Redline'

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
      setError('Couldn’t upload that resume. Try again, or check that the PDF has selectable text')
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
    <StepLayout
      step={0}
      title="Read your resume the way a recruiter will"
      lead="Upload a PDF, paste the job you want, and get a scored review with rewrites for your weakest lines"
      aside={<SamplePreview />}
    >
      <Panel className="p-3">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={
            'flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center ' +
            'transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-ink ' +
            (dragOver
              ? 'border-blue-ink bg-raised'
              : 'border-line-strong hover:bg-raised/60') +
            (isLoading ? ' pointer-events-none' : '')
          }
        >
          <FileUp size={24} strokeWidth={1.5} className="mb-4 text-ink-3" />
          <p className="text-base font-medium text-ink">
            {isLoading ? 'Uploading your resume…' : 'Drop your resume PDF'}
          </p>
          <p className="mt-1 text-sm text-ink-2">
            or <span className="text-blue-ink underline decoration-blue-ink/30 underline-offset-4">browse files</span>
          </p>
          <p className="mt-6 text-xs text-ink-3">PDF with selectable text, at least 50 words</p>
          <input
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileUpload}
            className="sr-only"
            disabled={isLoading}
          />
        </label>
      </Panel>
      {error && <FormError>{error}</FormError>}
    </StepLayout>
  )
}

/** What the review produces: one of its rewrites, shown before upload. */
function SamplePreview() {
  return (
    <div className="max-w-[30rem] border-t border-line pt-6">
      <p className="mb-3 text-[13px] text-ink-3">From a sample review · High priority · Impact</p>
      <Redline
        original="Built an internal dashboard for the analytics team."
        rewrite="Built an internal analytics dashboard adopted by 40+ employees, cutting weekly reporting time by ~6 hours."
      />
    </div>
  )
}
