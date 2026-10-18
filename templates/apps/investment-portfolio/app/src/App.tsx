import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { ArgentLayout } from './components/ArgentLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AssetDetail = lazy(() =>
  import('./pages/AssetDetail.js').then((m) => ({ default: m.AssetDetail })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Holdings = lazy(() => import('./pages/Holdings.js').then((m) => ({ default: m.Holdings })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const News = lazy(() => import('./pages/News.js').then((m) => ({ default: m.News })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Rebalance = lazy(() => import('./pages/Rebalance.js').then((m) => ({ default: m.Rebalance })))
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
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
                <Route element={<ArgentLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/holdings" element={<Holdings />} />
                  <Route path="/assets/:symbol" element={<AssetDetail />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/rebalance" element={<Rebalance />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/news" element={<News />} />
                  <Route path="/notifications" element={<Notifications />} />
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
