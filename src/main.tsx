import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { DEFAULT_SLUG } from './lib/defaults'
import InvitePage from './invite/InvitePage'

// 관리자 코드는 하객에게 내려가지 않도록 분리 로드
const AdminApp = lazy(() => import('./admin/AdminApp'))
const PreviewPage = lazy(() => import('./invite/PreviewPage'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-[100svh]" style={{ background: 'var(--c-bg)' }} />}>
        <Routes>
          <Route path="/" element={<Navigate to={`/invite/${DEFAULT_SLUG}`} replace />} />
          <Route path="/invite/:slug" element={<InvitePage />} />
          <Route path="/admin/preview" element={<PreviewPage />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="*" element={<Navigate to={`/invite/${DEFAULT_SLUG}`} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
)
