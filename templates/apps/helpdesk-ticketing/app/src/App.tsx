import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ThemeBootstrapper } from './components/ThemeBootstrapper.js'
import { About } from './pages/About.js'
import { DashboardPage } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { KnowledgeBasePage } from './pages/KnowledgeBase.js'
import { KnowledgeBaseNewPage } from './pages/KnowledgeBaseNew.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ReportsPage } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TicketDetailPage } from './pages/TicketDetail.js'
import { TicketNewPage } from './pages/TicketNew.js'
import { TicketsPage } from './pages/Tickets.js'
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
          <ThemeBootstrapper />
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/billing" element={<Navigate to="/settings" replace />} />
            <Route
              path="/knowledge-base/category/:categoryId"
              element={<Navigate to="/knowledge-base" replace />}
            />
            <Route
              path="/knowledge-base/articles/:articleId"
              element={<Navigate to="/knowledge-base" replace />}
            />
            <Route path="/settings/team" element={<Navigate to="/settings" replace />} />
            {/* Friendly redirects for surfaces that historically promised
             *  routes that never existed in this flagship — the matching
             *  affordances have been simplified, but a stale bookmark or
             *  hand-typed URL still lands somewhere meaningful instead of
             *  bouncing through the catch-all. */}
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
            <Route path="/search" element={<Navigate to="/tickets" replace />} />
            <Route path="/security" element={<Navigate to="/settings" replace />} />

            {/* All helpdesk routes behind AuthGuard */}
            <Route element={<AuthGuard />}>
              <Route index element={<DashboardPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/tickets/new" element={<TicketNewPage />} />
              <Route path="/tickets/:id" element={<TicketDetailPage />} />
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
              <Route path="/knowledge-base/new" element={<KnowledgeBaseNewPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Public content pages — outside AuthGuard so anonymous visitors can read them */}
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
