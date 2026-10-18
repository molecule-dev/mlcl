import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EnergyMonitoringLayout } from './components/EnergyMonitoringLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlertRule = lazy(() => import('./pages/AlertRule.js').then((m) => ({ default: m.AlertRule })))
const Alerts = lazy(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const DeviceDetail = lazy(() =>
  import('./pages/DeviceDetail.js').then((m) => ({ default: m.DeviceDetail })),
)
const Devices = lazy(() => import('./pages/Devices.js').then((m) => ({ default: m.Devices })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<EnergyMonitoringLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/devices" element={<Devices />} />
                  <Route path="/devices/:id" element={<DeviceDetail />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/rules/new" element={<AlertRule />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
