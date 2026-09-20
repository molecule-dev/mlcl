import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { ThemeBootstrapper } from './components/ThemeBootstrapper.js'
import { About } from './pages/About.js'
import { ExplorePage } from './pages/Explore.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyReportsPage } from './pages/MyReports.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ReportDetailPage } from './pages/ReportDetail.js'
import { ReportIssuePage } from './pages/ReportIssue.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { WatchAreasPage } from './pages/WatchAreas.js'

export function App() {
  return (
    <BrowserRouter>
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
