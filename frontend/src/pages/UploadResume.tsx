import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = 'https://resumai-production-c766.up.railway.app'

export default function UploadResume() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.pdf')) {
      setError('Only PDF files are supported')
      return
    }

    setIsLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response =await axios.post(`${API_URL}/api/resume/upload-resume`, formData, {
        withCredentials: true,
      })
      localStorage.setItem('session_id', response.data.session_id)
      navigate('/job-description')
    } catch (err) {
      setError('Failed to upload resume. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Resumai</h1>
        <p style={styles.subtitle}>AI-powered resume analyzer</p>

        <div style={styles.uploadBox}>
          <p style={styles.uploadText}>Upload your resume to get started</p>
          <label style={styles.uploadButton}>
            {isLoading ? 'Uploading...' : 'Choose PDF'}
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isLoading}
            />
          </label>
          <p style={styles.fileType}>PDF files only</p>
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
    maxWidth: '480px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '40px',
  },
  uploadBox: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '40px 24px',
    marginBottom: '16px',
  },
  uploadText: {
    fontSize: '16px',
    color: '#444',
    marginBottom: '20px',
  },
  uploadButton: {
    display: 'inline-block',
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '12px 32px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
  },
  fileType: {
    fontSize: '13px',
    color: '#999',
    marginTop: '12px',
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '12px',
  },
}