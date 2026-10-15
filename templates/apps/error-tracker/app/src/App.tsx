import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FaultlineLayout } from './components/FaultlineLayout.js'
import { About } from './pages/About.js'
import { AlertDetail } from './pages/AlertDetail.js'
import { Alerts } from './pages/Alerts.js'
import { Dashboard } from './pages/Dashboard.js'
import { Discover } from './pages/Discover.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { IssueDetail } from './pages/IssueDetail.js'
import { Issues } from './pages/Issues.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { Performance } from './pages/Performance.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Projects } from './pages/Projects.js'
import { ReleaseDetail } from './pages/ReleaseDetail.js'
import { Releases } from './pages/Releases.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
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
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated routes (sidebar layout) */}
            <Route element={<AuthGuard />}>
              <Route element={<FaultlineLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/issues/:id" element={<IssueDetail />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/alerts/:id" element={<AlertDetail />} />
                <Route path="/releases" element={<Releases />} />
                <Route path="/releases/:version" element={<ReleaseDetail />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/performance" element={<Performance />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/team" element={<Team />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>

            {/* 404 — must be last */}
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
