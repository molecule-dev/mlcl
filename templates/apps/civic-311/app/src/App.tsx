import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { ThemeBootstrapper } from './components/ThemeBootstrapper.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ExplorePage = lazyPage(() =>
  import('./pages/Explore.js').then((m) => ({ default: m.ExplorePage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyReportsPage = lazyPage(() =>
  import('./pages/MyReports.js').then((m) => ({ default: m.MyReportsPage })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportDetailPage = lazyPage(() =>
  import('./pages/ReportDetail.js').then((m) => ({ default: m.ReportDetailPage })),
)
const ReportIssuePage = lazyPage(() =>
  import('./pages/ReportIssue.js').then((m) => ({ default: m.ReportIssuePage })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WatchAreasPage = lazyPage(() =>
  import('./pages/WatchAreas.js').then((m) => ({ default: m.WatchAreasPage })),
)

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
