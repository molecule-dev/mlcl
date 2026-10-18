import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SignalinkLayout } from './components/SignalinkLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlertDetail = lazy(() =>
  import('./pages/AlertDetail.js').then((m) => ({ default: m.AlertDetail })),
)
const Alerts = lazy(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const IncidentDetail = lazy(() =>
  import('./pages/IncidentDetail.js').then((m) => ({ default: m.IncidentDetail })),
)
const Incidents = lazy(() => import('./pages/Incidents.js').then((m) => ({ default: m.Incidents })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Saved = lazy(() => import('./pages/Saved.js').then((m) => ({ default: m.Saved })))
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Services = lazy(() => import('./pages/Services.js').then((m) => ({ default: m.Services })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const StreamDetail = lazy(() =>
  import('./pages/StreamDetail.js').then((m) => ({ default: m.StreamDetail })),
)
const Streams = lazy(() => import('./pages/Streams.js').then((m) => ({ default: m.Streams })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TraceDetail = lazy(() =>
  import('./pages/TraceDetail.js').then((m) => ({ default: m.TraceDetail })),
)
const Traces = lazy(() => import('./pages/Traces.js').then((m) => ({ default: m.Traces })))

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
              {/* Public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authenticated */}
              <Route element={<AuthGuard />}>
                <Route element={<SignalinkLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/traces" element={<Traces />} />
                  <Route path="/traces/:id" element={<TraceDetail />} />
                  <Route path="/streams" element={<Streams />} />
                  <Route path="/streams/:id" element={<StreamDetail />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/:id" element={<AlertDetail />} />
                  <Route path="/incidents" element={<Incidents />} />
                  <Route path="/incidents/:id" element={<IncidentDetail />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/saved" element={<Saved />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
