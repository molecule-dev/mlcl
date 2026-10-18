import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { ThemeBootstrapper } from './components/ThemeBootstrapper.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ExplorePage = lazy(() =>
  import('./pages/Explore.js').then((m) => ({ default: m.ExplorePage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyReportsPage = lazy(() =>
  import('./pages/MyReports.js').then((m) => ({ default: m.MyReportsPage })),
)
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportDetailPage = lazy(() =>
  import('./pages/ReportDetail.js').then((m) => ({ default: m.ReportDetailPage })),
)
const ReportIssuePage = lazy(() =>
  import('./pages/ReportIssue.js').then((m) => ({ default: m.ReportIssuePage })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WatchAreasPage = lazy(() =>
  import('./pages/WatchAreas.js').then((m) => ({ default: m.WatchAreasPage })),
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
          <ThemeBootstrapper />
          <Suspense fallback={null}>
            <Routes>
              {/* Public landing + auth routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public content + pricing pages — outside AuthGuard so
               * anonymous visitors can read them. */}
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* All civic routes behind AuthGuard — reporting is the
               * signature flow and it is identity-bound (reporter, watch
               * areas, confirmations are all per-account). */}
              <Route element={<AuthGuard />}>
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/report" element={<ReportIssuePage />} />
                <Route path="/my-reports" element={<MyReportsPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/watch-areas" element={<WatchAreasPage />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>

              <Route path="*" element={<Landing />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
