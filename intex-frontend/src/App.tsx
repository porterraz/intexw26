import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import { ProtectedRoute } from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import { ImpactDashboardPage } from './pages/ImpactDashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import PrivacyPage from './pages/PrivacyPage'
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { CaseloadPage } from './pages/admin/CaseloadPage'
import { ResidentDetailPage } from './pages/admin/ResidentDetailPage'
import { NewResidentPage } from './pages/admin/NewResidentPage'
import { DonorsPage } from './pages/admin/DonorsPage'
import { DonorDetailPage } from './pages/admin/DonorDetailPage'
import { ProcessRecordingPage } from './pages/admin/ProcessRecordingPage'
import { VisitationPage } from './pages/admin/VisitationPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { SocialMediaPage } from './pages/admin/SocialMediaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/impact" element={<ImpactDashboardPage />} />

        <Route element={<ProtectedRoute requiredRole="Admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/residents" element={<CaseloadPage />} />
          <Route path="/admin/residents/new" element={<NewResidentPage />} />
          <Route path="/admin/residents/:id" element={<ResidentDetailPage />} />
          <Route path="/admin/donors" element={<DonorsPage />} />
          <Route path="/admin/donors/:id" element={<DonorDetailPage />} />
          <Route path="/admin/process-recordings/:residentId" element={<ProcessRecordingPage />} />
          <Route path="/admin/visitations/:residentId" element={<VisitationPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/social-media" element={<SocialMediaPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}
