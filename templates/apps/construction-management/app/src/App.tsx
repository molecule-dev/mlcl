import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { GroundworkLayout } from './components/GroundworkLayout.js'
import { About } from './pages/About.js'
import { DailyLogs } from './pages/DailyLogs.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ProjectDetail } from './pages/ProjectDetail.js'
import { Projects } from './pages/Projects.js'
import { PunchList } from './pages/PunchList.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RfiDetail } from './pages/RfiDetail.js'
import { Rfis } from './pages/Rfis.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Subcontractors } from './pages/Subcontractors.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <RootErrorBoundary>
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
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />

            {/* Authenticated workspace */}
            <Route element={<AuthGuard />}>
              <Route element={<GroundworkLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:projectId" element={<ProjectDetail />} />
                <Route path="/projects/:projectId/logs" element={<DailyLogs />} />
                <Route path="/projects/:projectId/punch" element={<PunchList />} />
                <Route path="/projects/:projectId/rfis" element={<Rfis />} />
                <Route path="/projects/:projectId/rfis/:rfiId" element={<RfiDetail />} />
                <Route path="/projects/:projectId/subs" element={<Subcontractors />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
