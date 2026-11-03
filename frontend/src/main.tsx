import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import AuthProvider from './components/AuthProvider'
import UploadResume from './pages/UploadResume'
import UploadJobDescription from './pages/UploadJobDescription'
import Analysis from './pages/Analysis'
import History from './pages/History'
import HistoryDetail from './pages/HistoryDetail'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<UploadResume />} />
          <Route path="/job-description" element={<UploadJobDescription />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
