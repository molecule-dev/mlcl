import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { OncallLayout } from './components/OncallLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const EscalationPolicies = lazyPage(() =>
  import('./pages/EscalationPolicies.js').then((m) => ({ default: m.EscalationPolicies })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const IncidentDetail = lazyPage(() =>
  import('./pages/IncidentDetail.js').then((m) => ({ default: m.IncidentDetail })),
)
const Incidents = lazyPage(() =>
  import('./pages/Incidents.js').then((m) => ({ default: m.Incidents })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PostmortemDetail = lazyPage(() =>
  import('./pages/PostmortemDetail.js').then((m) => ({ default: m.PostmortemDetail })),
)
const Postmortems = lazyPage(() =>
  import('./pages/Postmortems.js').then((m) => ({ default: m.Postmortems })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const ScheduleDetail = lazyPage(() =>
  import('./pages/ScheduleDetail.js').then((m) => ({ default: m.ScheduleDetail })),
)
const Schedules = lazyPage(() =>
  import('./pages/Schedules.js').then((m) => ({ default: m.Schedules })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazyPage(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
                <Route element={<OncallLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/incidents/:id" element={<IncidentDetail />} />
                  <Route path="/schedules" element={<Schedules />} />
                  <Route path="/schedules/:id" element={<ScheduleDetail />} />
                  <Route path="/escalation-policies" element={<EscalationPolicies />} />
                  <Route path="/postmortems" element={<Postmortems />} />
                  <Route path="/postmortems/:id" element={<PostmortemDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
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
