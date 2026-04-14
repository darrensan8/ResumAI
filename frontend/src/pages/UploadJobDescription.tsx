import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'https://resumai-production-c766.up.railway.app'

export default function UploadJobDescription() {
  const navigate = useNavigate()
  const [jobDescription, setJobDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = jobDescription.trim().split(/\s+/).filter(Boolean).length

  const handleSubmit = async () => {
    if (wordCount < 50) {
      setError('Job description must be at least 50 words.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await axios.post(
        `${API_URL}/api/job-description/upload-job-description`,
        { job_description: jobDescription },
        { withCredentials: true }
      )
      navigate('/analysis')
    } catch (err) {
      setError('Failed to upload job description. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Resumai</h1>
        <p style={styles.subtitle}>Paste the job description below</p>

        <textarea
          style={styles.textarea}
          placeholder="Copy and paste the full job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />

        <div style={styles.footer}>
          <p style={styles.wordCount}>{wordCount} / 50 words minimum</p>
          <button
            style={{
              ...styles.button,
              opacity: wordCount < 50 || isLoading ? 0.5 : 1,
              cursor: wordCount < 50 || isLoading ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={wordCount < 50 || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze Resume'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '48px',
    width: '100%',
    maxWidth: '640px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  textarea: {
    width: '100%',
    height: '280px',
    padding: '16px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '16px',
  },
  wordCount: {
    fontSize: '13px',
    color: '#999',
  },
  button: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '500' as const,
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '12px',
  },
}