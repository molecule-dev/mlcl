import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SiftLayout } from './components/SiftLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlertDetail = lazy(() =>
  import('./pages/AlertDetail.js').then((m) => ({ default: m.AlertDetail })),
)
const Alerts = lazy(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Categories = lazy(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Deals = lazy(() => import('./pages/Deals.js').then((m) => ({ default: m.Deals })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PriceHistory = lazy(() =>
  import('./pages/PriceHistory.js').then((m) => ({ default: m.PriceHistory })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetail = lazy(() =>
  import('./pages/ProductDetail.js').then((m) => ({ default: m.ProductDetail })),
)
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
                <Route element={<SiftLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/deals" element={<Deals />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/alerts/:id" element={<AlertDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/products/:id/history" element={<PriceHistory />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/billing" element={<Billing />} />
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
