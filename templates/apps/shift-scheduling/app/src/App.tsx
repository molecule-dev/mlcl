import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ShiftlyLayout } from './components/ShiftlyLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Availability = lazy(() =>
  import('./pages/Availability.js').then((m) => ({ default: m.Availability })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const OpenShifts = lazy(() =>
  import('./pages/OpenShifts.js').then((m) => ({ default: m.OpenShifts })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Schedule = lazy(() => import('./pages/Schedule.js').then((m) => ({ default: m.Schedule })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const ShiftDetail = lazy(() =>
  import('./pages/ShiftDetail.js').then((m) => ({ default: m.ShiftDetail })),
)
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Staff = lazy(() => import('./pages/Staff.js').then((m) => ({ default: m.Staff })))
const SwapRequests = lazy(() =>
  import('./pages/SwapRequests.js').then((m) => ({ default: m.SwapRequests })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Timesheets = lazy(() =>
  import('./pages/Timesheets.js').then((m) => ({ default: m.Timesheets })),
)

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
              <Route path="/" element={<Landing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                <Route element={<ShiftlyLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/shifts/:id" element={<ShiftDetail />} />
                  <Route path="/open-shifts" element={<OpenShifts />} />
                  <Route path="/swap-requests" element={<SwapRequests />} />
                  <Route path="/availability" element={<Availability />} />
                  <Route path="/staff" element={<Staff />} />
                  <Route path="/timesheets" element={<Timesheets />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
