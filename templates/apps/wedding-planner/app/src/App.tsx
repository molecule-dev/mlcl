import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WeddingLayout } from './components/WeddingLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Budget = lazy(() => import('./pages/Budget.js').then((m) => ({ default: m.Budget })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Guests = lazy(() => import('./pages/Guests.js').then((m) => ({ default: m.Guests })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Rsvp = lazy(() => import('./pages/Rsvp.js').then((m) => ({ default: m.Rsvp })))
const SeatingChart = lazy(() =>
  import('./pages/SeatingChart.js').then((m) => ({ default: m.SeatingChart })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Tasks = lazy(() => import('./pages/Tasks.js').then((m) => ({ default: m.Tasks })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Vendors = lazy(() => import('./pages/Vendors.js').then((m) => ({ default: m.Vendors })))

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter useTransitions={false}>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              {/*
                Public RSVP collection surface: guests confirm by code — no
                account, no email. The page finds the guest by name inside the
                wedding keyed by :code and records their response directly.
              */}
              <Route path="/rsvp/:code" element={<Rsvp />} />
              <Route element={<AuthGuard />}>
                <Route element={<WeddingLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/guests" element={<Guests />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/vendors" element={<Vendors />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/seating" element={<SeatingChart />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
