import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { PreferencesApplier } from './components/PreferencesApplier.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { StudioLayout } from './components/StudioLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const IssueDetail = lazyPage(() =>
  import('./pages/IssueDetail.js').then((m) => ({ default: m.IssueDetail })),
)
const IssueEditor = lazyPage(() =>
  import('./pages/IssueEditor.js').then((m) => ({ default: m.IssueEditor })),
)
const Issues = lazyPage(() => import('./pages/Issues.js').then((m) => ({ default: m.Issues })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const PublicIssue = lazyPage(() =>
  import('./pages/PublicIssue.js').then((m) => ({ default: m.PublicIssue })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Subscribers = lazyPage(() =>
  import('./pages/Subscribers.js').then((m) => ({ default: m.Subscribers })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Unsubscribe = lazyPage(() =>
  import('./pages/Unsubscribe.js').then((m) => ({ default: m.Unsubscribe })),
)
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
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
