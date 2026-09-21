import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ShortlistLayout } from './components/ShortlistLayout.js'
import { About } from './pages/About.js'
import { Billing } from './pages/Billing.js'
import { CandidateDetail } from './pages/CandidateDetail.js'
import { Candidates } from './pages/Candidates.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Interviews } from './pages/Interviews.js'
import { JobDetail } from './pages/JobDetail.js'
import { Jobs } from './pages/Jobs.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewJob } from './pages/NewJob.js'
import { Notifications } from './pages/Notifications.js'
import { Pipeline } from './pages/Pipeline.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Reports } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route element={<AuthGuard />}>
              <Route element={<ShortlistLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/pipeline" element={<Pipeline />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/jobs/new" element={<NewJob />} />
                <Route path="/jobs/:id" element={<JobDetail />} />
                <Route path="/candidates" element={<Candidates />} />
                <Route path="/candidates/:id" element={<CandidateDetail />} />
                <Route path="/interviews" element={<Interviews />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
