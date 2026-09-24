import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { PreferencesApplier } from './components/PreferencesApplier.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { StudioLayout } from './components/StudioLayout.js'
import { About } from './pages/About.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { IssueDetail } from './pages/IssueDetail.js'
import { IssueEditor } from './pages/IssueEditor.js'
import { Issues } from './pages/Issues.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { PublicIssue } from './pages/PublicIssue.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Subscribers } from './pages/Subscribers.js'
import { Terms } from './pages/Terms.js'
import { Unsubscribe } from './pages/Unsubscribe.js'
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
          <PreferencesApplier />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public reading: the rendered issue + tokened unsubscribe flow */}
            <Route path="/issues/:id" element={<PublicIssue />} />
            <Route path="/unsubscribe/:token" element={<Unsubscribe />} />

            {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Authenticated creator routes — the shared ResponsiveAppShell
              (StudioLayout) carries the sidebar/topbar/drawer chrome; pages
              render their content only. PlanUpdated keeps the landing chrome
              it had before the shell existed. */}
            <Route element={<AuthGuard />}>
              <Route element={<StudioLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/issues/new" element={<IssueEditor />} />
                <Route path="/issues/:id/edit" element={<IssueEditor />} />
                <Route path="/issues/:id/detail" element={<IssueDetail />} />
                <Route path="/subscribers" element={<Subscribers />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>

            {/* Fallback */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
