import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import CookieBanner from './components/CookieBanner'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingSpinner } from './components/LoadingSpinner'

const HomePage = lazy(() => import('./pages/HomePage'))
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const MfaSetupPage = lazy(() => import('./pages/MfaSetupPage').then(m => ({ default: m.MfaSetupPage })))
const MfaVerifyPage = lazy(() => import('./pages/MfaVerifyPage').then(m => ({ default: m.MfaVerifyPage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const ImpactDashboardPage = lazy(() => import('./pages/ImpactDashboardPage').then(m => ({ default: m.ImpactDashboardPage })))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'))
const CaseloadPage = lazy(() => import('./pages/admin/CaseloadPage').then(m => ({ default: m.CaseloadPage })))
const ResidentDetailPage = lazy(() => import('./pages/admin/ResidentDetailPage').then(m => ({ default: m.ResidentDetailPage })))
const NewResidentPage = lazy(() => import('./pages/admin/NewResidentPage').then(m => ({ default: m.NewResidentPage })))
const DonorsPage = lazy(() => import('./pages/admin/DonorsPage').then(m => ({ default: m.DonorsPage })))
const DonorDetailPage = lazy(() => import('./pages/admin/DonorDetailPage').then(m => ({ default: m.DonorDetailPage })))
const NewSupporterPage = lazy(() => import('./pages/admin/NewSupporterPage').then(m => ({ default: m.NewSupporterPage })))
const ProcessRecordingPage = lazy(() => import('./pages/admin/ProcessRecordingPage').then(m => ({ default: m.ProcessRecordingPage })))
const VisitationPage = lazy(() => import('./pages/admin/VisitationPage').then(m => ({ default: m.VisitationPage })))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SocialMediaPage = lazy(() => import('./pages/admin/SocialMediaPage').then(m => ({ default: m.SocialMediaPage })))
const AdminDonationsPage = lazy(() => import('./pages/admin/AdminDonationsPage').then(m => ({ default: m.AdminDonationsPage })))
const DonatePage = lazy(() => import('./pages/DonatePage'))
const DonorDashboard = lazy(() => import('./pages/DonorDashboard'))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoadingSpinner /></div>}>
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
          <Route path="/admin/donors" element={<DonorsPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
          <Route path="/admin/donations" element={<AdminDonationsPage />} />
          <Route path="/admin/social-media" element={<SocialMediaPage />} />
          <Route path="/admin/social-media/ml-dashboard" element={<Navigate to="/admin/social-media" replace />} />
          <Route path="/admin/residents/new" element={<NewResidentPage />} />
          <Route path="/admin/residents/:id" element={<ResidentDetailPage />} />
          <Route path="/admin/donors/new" element={<NewSupporterPage />} />
          <Route path="/admin/donors/:id" element={<DonorDetailPage />} />
          <Route path="/admin/process-recordings/:residentId" element={<ProcessRecordingPage />} />
          <Route path="/admin/visitations/:residentId" element={<VisitationPage />} />
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
      </Suspense>
      <CookieBanner />
    </BrowserRouter>
  )
}
