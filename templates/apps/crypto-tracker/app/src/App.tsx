import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SigilLayout } from './components/SigilLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlertNew = lazy(() => import('./pages/AlertNew.js').then((m) => ({ default: m.AlertNew })))
const Alerts = lazy(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const CoinDetail = lazy(() =>
  import('./pages/CoinDetail.js').then((m) => ({ default: m.CoinDetail })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Markets = lazy(() => import('./pages/Markets.js').then((m) => ({ default: m.Markets })))
const News = lazy(() => import('./pages/News.js').then((m) => ({ default: m.News })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Portfolio = lazy(() => import('./pages/Portfolio.js').then((m) => ({ default: m.Portfolio })))
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Transactions = lazy(() =>
  import('./pages/Transactions.js').then((m) => ({ default: m.Transactions })),
)
const Watchlist = lazy(() => import('./pages/Watchlist.js').then((m) => ({ default: m.Watchlist })))

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
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<SigilLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/markets" element={<Markets />} />
                  <Route path="/coin/:symbol" element={<CoinDetail />} />
                  <Route path="/portfolio" element={<Portfolio />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/new" element={<AlertNew />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
