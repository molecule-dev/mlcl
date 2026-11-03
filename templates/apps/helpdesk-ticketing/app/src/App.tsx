import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ThemeBootstrapper } from './components/ThemeBootstrapper.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const DashboardPage = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const KnowledgeBasePage = lazyPage(() =>
  import('./pages/KnowledgeBase.js').then((m) => ({ default: m.KnowledgeBasePage })),
)
const KnowledgeBaseNewPage = lazyPage(() =>
  import('./pages/KnowledgeBaseNew.js').then((m) => ({ default: m.KnowledgeBaseNewPage })),
)
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportsPage = lazyPage(() =>
  import('./pages/Reports.js').then((m) => ({ default: m.ReportsPage })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TicketDetailPage = lazyPage(() =>
  import('./pages/TicketDetail.js').then((m) => ({ default: m.TicketDetailPage })),
)
const TicketNewPage = lazyPage(() =>
  import('./pages/TicketNew.js').then((m) => ({ default: m.TicketNewPage })),
)
const TicketsPage = lazyPage(() =>
  import('./pages/Tickets.js').then((m) => ({ default: m.TicketsPage })),
)
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <ThemeBootstrapper />
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
