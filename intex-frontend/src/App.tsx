import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import { ProtectedRoute } from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import { ImpactDashboardPage } from './pages/ImpactDashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { LoginPage } from './pages/LoginPage'
import { MfaSetupPage } from './pages/MfaSetupPage'
import { MfaVerifyPage } from './pages/MfaVerifyPage'
import PrivacyPage from './pages/PrivacyPage'
import { DonorDashboard } from './pages/DonorDashboard'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import { CaseloadPage } from './pages/admin/CaseloadPage'
import { ResidentDetailPage } from './pages/admin/ResidentDetailPage'
import { NewResidentPage } from './pages/admin/NewResidentPage'
import { DonorsPage } from './pages/admin/DonorsPage'
import { DonorDetailPage } from './pages/admin/DonorDetailPage'
import { NewSupporterPage } from './pages/admin/NewSupporterPage'
import { ProcessRecordingPage } from './pages/admin/ProcessRecordingPage'
import { VisitationPage } from './pages/admin/VisitationPage'
import { ReportsPage } from './pages/admin/ReportsPage'
import { SocialMediaPage } from './pages/admin/SocialMediaPage'
import { AdminDonationsPage } from './pages/admin/AdminDonationsPage'
import DonatePage from './pages/DonatePage'


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/mfa-setup" element={<MfaSetupPage />} />
        <Route path="/mfa-verify" element={<MfaVerifyPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/impact" element={<ImpactDashboardPage />} />

        <Route element={<ProtectedRoute requiredRole="Admin" />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/residents" element={<CaseloadPage />} />
          <Route path="/admin/residents/new" element={<NewResidentPage />} />
          <Route path="/admin/residents/:id" element={<ResidentDetailPage />} />
          <Route path="/admin/donors" element={<DonorsPage />} />
          <Route path="/admin/donors/new" element={<NewSupporterPage />} />
          <Route path="/admin/donors/:id" element={<DonorDetailPage />} />
          <Route path="/admin/process-recordings/:residentId" element={<ProcessRecordingPage />} />
          <Route path="/admin/visitations/:residentId" element={<VisitationPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/donations" element={<AdminDonationsPage />} />
          <Route path="/admin/social-media" element={<SocialMediaPage />} />
          <Route path="/admin/social-media/ml-dashboard" element={<Navigate to="/admin/social-media" replace />} />
          <Route path="/admin/mfa-setup" element={<MfaSetupPage />} />
        </Route>

        {/* Donor-Only Routes */}
        <Route
          path="/donor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Donor']}>
              <DonorDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/donate"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Donor']}>
              <DonatePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <CookieBanner />
    </BrowserRouter>
  )
}
