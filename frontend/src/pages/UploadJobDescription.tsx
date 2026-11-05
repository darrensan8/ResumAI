import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_URL } from '../lib/api'
import StepLayout from '../components/StepLayout'
import Panel from '../components/Panel'
import Button from '../components/Button'
import FormError from '../components/FormError'

const ROLE_LEVELS = ['intern', 'entry', 'mid', 'senior', 'staff', 'principal']
const MIN_WORDS = 50

export default function UploadJobDescription() {
  const navigate = useNavigate()
  const [jobDescription, setJobDescription] = useState('')
  const [roleLevel, setRoleLevel] = useState(() => localStorage.getItem('role_level') || 'entry')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length
  const enough = wordCount >= MIN_WORDS
  const ready = enough && !isLoading

  const handleSubmit = async () => {
    if (!enough) {
      setError(`The job description needs at least ${MIN_WORDS} words`)
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
      setError('Couldn’t save the job description. Try again')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <StepLayout
      step={1}
      title="Paste the job you’re applying for"
      lead="The review scores your resume against this posting and the level you pick, so paste the whole thing, requirements included"
    >
      <Panel>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-2 text-sm text-ink-2">Role level</legend>
          <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-raised p-1 sm:grid-cols-6">
            {ROLE_LEVELS.map((level) => {
              const selected = roleLevel === level
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setRoleLevel(level)}
                  className={
                    'h-8 rounded-md text-sm capitalize transition-colors duration-150 ' +
                    'focus-visible:outline-2 focus-visible:outline-blue-ink ' +
                    (selected
                      ? 'border border-line-strong bg-paper font-medium text-ink'
                      : 'text-ink-2 hover:text-ink')
                  }
                >
                  {level}
                </button>
              )
            })}
          </div>
        </fieldset>

        <label htmlFor="jd" className="mt-6 mb-2 block text-sm text-ink-2">
          Job description
        </label>
        <textarea
          id="jd"
          className={
            'h-72 w-full resize-y rounded-lg border border-line-strong bg-paper p-4 text-[15px] leading-6 text-ink ' +
            'outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-3 ' +
            'focus:border-blue-ink focus:shadow-[0_0_0_3px_rgb(35_70_160_/_0.12)]'
          }
          placeholder="Paste the full posting"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <div className="mt-4 flex items-center justify-between gap-4">
          <span className={'text-sm tabular-nums ' + (enough ? 'text-moss' : 'text-ink-3')}>
            {enough ? `${wordCount} words` : `${wordCount} of ${MIN_WORDS} words`}
          </span>
          <Button onClick={handleSubmit} disabled={!ready}>
            {isLoading ? 'Saving…' : 'Review my resume'}
          </Button>
        </div>

        {error && <FormError>{error}</FormError>}
      </Panel>
    </StepLayout>
  )
}
