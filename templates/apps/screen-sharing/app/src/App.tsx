import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ScreenSharingLayout } from './components/ScreenSharingLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazy(() => import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Library = lazy(() => import('./pages/Library.js').then((m) => ({ default: m.Library })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const PublicShare = lazy(() =>
  import('./pages/PublicShare.js').then((m) => ({ default: m.PublicShare })),
)
const Record = lazy(() => import('./pages/Record.js').then((m) => ({ default: m.Record })))
const RecordingDetail = lazy(() =>
  import('./pages/RecordingDetail.js').then((m) => ({ default: m.RecordingDetail })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Shared = lazy(() => import('./pages/Shared.js').then((m) => ({ default: m.Shared })))
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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/share/:token" element={<PublicShare />} />
              <Route element={<AuthGuard />}>
                <Route element={<ScreenSharingLayout />}>
                  <Route path="/library" element={<Library />} />
                  <Route path="/recordings/:id" element={<RecordingDetail />} />
                  <Route path="/record" element={<Record />} />
                  <Route path="/shared" element={<Shared />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/profile" element={<Profile />} />
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
