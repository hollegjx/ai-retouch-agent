import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from '@/layouts/RequireAuth'
import WorkbenchLayout from '@/layouts/WorkbenchLayout'
import StatePanel from '@/components/ui/StatePanel'

const AuthPage = lazy(() => import('@/pages/auth/AuthPage'))
const CreatePage = lazy(() => import('@/pages/create/CreatePage'))
const CandidatesPage = lazy(() => import('@/pages/create/CandidatesPage'))
const EditorPage = lazy(() => import('@/pages/editor/EditorPage'))
const LandingPage = lazy(() => import('@/pages/home/LandingPage'))
const MarketingPage = lazy(() => import('@/pages/marketing/MarketingPage'))
const BatchPage = lazy(() => import('@/pages/batch/BatchPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="page">
            <StatePanel title="正在打开工作空间" loading />
          </div>
        }
      >
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route element={<WorkbenchLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route element={<RequireAuth />}>
              <Route path="/create" element={<CreatePage />} />
              <Route path="/candidates/:runId" element={<CandidatesPage />} />
              <Route path="/editor" element={<EditorPage />} />
              <Route path="/editor/:sessionId" element={<EditorPage />} />
              <Route path="/marketing" element={<MarketingPage />} />
              <Route path="/marketing/:sessionId" element={<MarketingPage />} />
              <Route path="/batch" element={<BatchPage />} />
              <Route path="/batch/:runId" element={<BatchPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
