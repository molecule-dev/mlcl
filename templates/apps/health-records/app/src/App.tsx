import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MeridianLayout } from './components/MeridianLayout.js'
import { About } from './pages/About.js'
import { Dashboard } from './pages/Dashboard.js'
import { Documents } from './pages/Documents.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Immunizations } from './pages/Immunizations.js'
import { InviteShare } from './pages/InviteShare.js'
import { LabResultDetail } from './pages/LabResultDetail.js'
import { LabResults } from './pages/LabResults.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MedicationDetail } from './pages/MedicationDetail.js'
import { Medications } from './pages/Medications.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { RecordDetail } from './pages/RecordDetail.js'
import { Records } from './pages/Records.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Sharing } from './pages/Sharing.js'
import { SharingAccept } from './pages/SharingAccept.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { VisitDetail } from './pages/VisitDetail.js'
import { Visits } from './pages/Visits.js'
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
        <AnalyticsRouteListener />
        <Routes>
          {/* Public marketing + auth */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Authenticated app shell — sidebar nav + outlet */}
          <Route element={<AuthGuard />}>
            <Route element={<MeridianLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/records" element={<Records />} />
              <Route path="/records/:id" element={<RecordDetail />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/medications/:id" element={<MedicationDetail />} />
              <Route path="/labs" element={<LabResults />} />
              <Route path="/labs/:id" element={<LabResultDetail />} />
              <Route path="/immunizations" element={<Immunizations />} />
              <Route path="/visits" element={<Visits />} />
              <Route path="/visits/:id" element={<VisitDetail />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/sharing" element={<Sharing />} />
              <Route path="/sharing/new" element={<InviteShare />} />
              <Route path="/sharing/accept" element={<SharingAccept />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
