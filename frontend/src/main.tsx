import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import UploadResume from './pages/UploadResume'
import UploadJobDescription from './pages/UploadJobDescription'
import Analysis from './pages/Analysis'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadResume />} />
        <Route path="/job-description" element={<UploadJobDescription />} />
        <Route path="/analysis" element={<Analysis />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
)