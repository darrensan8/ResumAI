import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import React from 'react'

const API_URL = 'https://resumai-production-c766.up.railway.app'

export default function Analysis() {
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAnalysis = async () => {
      const sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        navigate('/')
        return
      }

      try {
        const response = await axios.post(
          `${API_URL}/api/analysis/analyze`,
          { role_level: 'intern' },
          {
            withCredentials: true,
            headers: { 'X-Session-ID': sessionId },
          }
        )
        setAnalysis(response.data)
      } catch (err) {
        setError('Failed to analyze resume. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalysis()
  }, [])

  if (isLoading) {
    return (
      <div style={styles.centered}>
        <p style={styles.loadingText}>Analyzing your resume...</p>
        <p style={styles.loadingSubtext}>This may take up to 30 seconds</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <p style={styles.error}>{error}</p>
        <button style={styles.button} onClick={() => navigate('/')}>
          Start Over
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>ResumAI</h1>
        <button style={styles.restartButton} onClick={() => navigate('/')}>
          Analyze Another
        </button>
      </div>

      {/* Overall Score */}
      <div style={styles.scoreCard}>
        <h2 style={styles.scoreLabel}>Overall Score</h2>
        <p style={styles.scoreNumber}>{analysis.overall_score}/100</p>
        <p style={styles.recommendation}>
          Hiring Recommendation:{' '}
          <strong>{analysis.hiring_recommendation?.replace('_', ' ').toUpperCase()}</strong>
        </p>
        <p style={styles.recruiterImpression}>{analysis.recruiter_first_impression}</p>
      </div>

      {/* Score Breakdown */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Score Breakdown</h2>
        <div style={styles.scoresGrid}>
          {Object.entries(analysis.scores || {}).map(([key, value]) => (
            <div key={key} style={styles.scoreItem}>
              <p style={styles.scoreItemLabel}>
                {key.replace(/_/g, ' ')}
              </p>
              <div style={styles.barTrack}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${value}%`,
                    backgroundColor: (value as number) >= 70 ? '#22c55e' : (value as number) >= 50 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <p style={styles.scoreItemValue}>{value as number}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths and Weaknesses */}
      <div style={styles.twoCol}>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Strengths</h2>
          {analysis.strengths?.map((s: string, i: number) => (
            <div key={i} style={styles.listItem}>
              <span style={styles.green}>✓</span> {s}
            </div>
          ))}
        </div>
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Weaknesses</h2>
          {analysis.weaknesses?.map((w: string, i: number) => (
            <div key={i} style={styles.listItem}>
              <span style={styles.red}>✗</span> {w}
            </div>
          ))}
        </div>
      </div>

      {/* Missing Keywords */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Missing Critical Keywords</h2>
        <div style={styles.tagContainer}>
          {analysis.keyword_analysis?.missing_critical_keywords?.map((k: string, i: number) => (
            <span key={i} style={styles.tag}>{k}</span>
          ))}
        </div>
      </div>

      {/* Improvements */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Improvements</h2>
        {analysis.improvements?.map((imp: any, i: number) => (
          <div key={i} style={styles.improvementCard}>
            <div style={styles.improvementHeader}>
              <span style={{
                ...styles.priorityBadge,
                backgroundColor: imp.priority === 'high' ? '#fee2e2' : imp.priority === 'medium' ? '#fef9c3' : '#dcfce7',
                color: imp.priority === 'high' ? '#dc2626' : imp.priority === 'medium' ? '#ca8a04' : '#16a34a',
              }}>
                {imp.priority?.toUpperCase()}
              </span>
              <span style={styles.categoryBadge}>{imp.category}</span>
            </div>
            <p style={styles.improvementSuggestion}>{imp.suggestion}</p>
            {imp.reference_text && (
              <p style={styles.referenceText}>"{imp.reference_text}"</p>
            )}
            {imp.example_rewrite && (
              <p style={styles.exampleRewrite}>→ {imp.example_rewrite}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  centered: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '30px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '100px',
    fontWeight: '700',
    color: '#2854ac',
  },
  restartButton: {
    backgroundColor: 'transparent',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '8px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#ddd',
  },
  scoreCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: '16px',
    color: '#000000',
    marginBottom: '16px',
    fontWeight: '400',
  },
  scoreNumber: {
    fontSize: '40px',
    fontWeight: '700',
    color: '#000000',
    marginBottom: '16px',
  },
  recommendation: {
    fontSize: '16px',
    color: '#000000',
    marginBottom: '16px',
  },
  recruiterImpression: {
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.6',
    fontStyle: 'italic',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  scoresGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  scoreItem: {
    display: 'grid',
    gridTemplateColumns: '200px 1fr 40px',
    alignItems: 'center',
    gap: '12px',
  },
  scoreItemLabel: {
    fontSize: '13px',
    color: '#444',
    textTransform: 'capitalize',
  },
  barTrack: {
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
    height: '8px',
    overflow: 'hidden',
  },
  barFill: {
    height: '8px',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  scoreItemValue: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'right',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '0',
  },
  listItem: {
    fontSize: '14px',
    color: '#444',
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  green: {
    color: '#22c55e',
    fontWeight: '700',
    marginRight: '6px',
  },
  red: {
    color: '#ef4444',
    fontWeight: '700',
    marginRight: '6px',
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  tag: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
  },
  improvementCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
  },
  improvementHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  priorityBadge: {
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '500',
  },
  improvementSuggestion: {
    fontSize: '14px',
    color: '#1a1a1a',
    marginBottom: '8px',
    lineHeight: '1.6',
  },
  referenceText: {
    fontSize: '13px',
    color: '#666',
    fontStyle: 'italic',
    marginBottom: '6px',
    backgroundColor: '#f9fafb',
    padding: '8px 12px',
    borderRadius: '4px',
  },
  exampleRewrite: {
    fontSize: '13px',
    color: '#2563eb',
    lineHeight: '1.6',
  },
  loadingText: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingSubtext: {
    fontSize: '14px',
    color: '#666',
  },
  error: {
    fontSize: '16px',
    color: '#ef4444',
  },
  button: {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '12px 32px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
  },
}