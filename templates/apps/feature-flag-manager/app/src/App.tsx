import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FeatureFlagManagerLayout } from './components/FeatureFlagManagerLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AuditLog = lazy(() => import('./pages/AuditLog.js').then((m) => ({ default: m.AuditLog })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Environments = lazy(() =>
  import('./pages/Environments.js').then((m) => ({ default: m.Environments })),
)
const FlagDetail = lazy(() =>
  import('./pages/FlagDetail.js').then((m) => ({ default: m.FlagDetail })),
)
const Flags = lazy(() => import('./pages/Flags.js').then((m) => ({ default: m.Flags })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewFlag = lazy(() => import('./pages/NewFlag.js').then((m) => ({ default: m.NewFlag })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SegmentDetail = lazy(() =>
  import('./pages/SegmentDetail.js').then((m) => ({ default: m.SegmentDetail })),
)
const Segments = lazy(() => import('./pages/Segments.js').then((m) => ({ default: m.Segments })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Authenticated routes (sidebar layout) */}
              <Route element={<AuthGuard />}>
                <Route element={<FeatureFlagManagerLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/flags" element={<Flags />} />
                  <Route path="/flags/new" element={<NewFlag />} />
                  <Route path="/flags/:key" element={<FlagDetail />} />
                  <Route path="/segments" element={<Segments />} />
                  <Route path="/segments/:key" element={<SegmentDetail />} />
                  <Route path="/environments" element={<Environments />} />
                  <Route path="/audit" element={<AuditLog />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
