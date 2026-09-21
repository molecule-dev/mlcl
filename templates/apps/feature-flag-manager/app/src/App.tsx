import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FeatureFlagManagerLayout } from './components/FeatureFlagManagerLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { AuditLog } from './pages/AuditLog.js'
import { Dashboard } from './pages/Dashboard.js'
import { Environments } from './pages/Environments.js'
import { FlagDetail } from './pages/FlagDetail.js'
import { Flags } from './pages/Flags.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewFlag } from './pages/NewFlag.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SegmentDetail } from './pages/SegmentDetail.js'
import { Segments } from './pages/Segments.js'
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
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated routes (sidebar layout) */}
            <Route element={<AuthGuard />}>
              <Route element={<FeatureFlagManagerLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/flags" element={<Flags />} />
                <Route path="/flags/new" element={<NewFlag />} />
                <Route path="/flags/:key" element={<FlagDetail />} />
                <Route path="/segments" element={<Segments />} />
                <Route path="/segments/:key" element={<SegmentDetail />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
