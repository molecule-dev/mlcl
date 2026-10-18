import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FaultlineLayout } from './components/FaultlineLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlertDetail = lazy(() =>
  import('./pages/AlertDetail.js').then((m) => ({ default: m.AlertDetail })),
)
const Alerts = lazy(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Discover = lazy(() => import('./pages/Discover.js').then((m) => ({ default: m.Discover })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const IssueDetail = lazy(() =>
  import('./pages/IssueDetail.js').then((m) => ({ default: m.IssueDetail })),
)
const Issues = lazy(() => import('./pages/Issues.js').then((m) => ({ default: m.Issues })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Performance = lazy(() =>
  import('./pages/Performance.js').then((m) => ({ default: m.Performance })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Projects = lazy(() => import('./pages/Projects.js').then((m) => ({ default: m.Projects })))
const ReleaseDetail = lazy(() =>
  import('./pages/ReleaseDetail.js').then((m) => ({ default: m.ReleaseDetail })),
)
const Releases = lazy(() => import('./pages/Releases.js').then((m) => ({ default: m.Releases })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazy(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
