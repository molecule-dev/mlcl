import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DonorLayout } from './components/DonorLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Campaigns = lazy(() => import('./pages/Campaigns.js').then((m) => ({ default: m.Campaigns })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const DonorDetail = lazy(() =>
  import('./pages/DonorDetail.js').then((m) => ({ default: m.DonorDetail })),
)
const Donors = lazy(() => import('./pages/Donors.js').then((m) => ({ default: m.Donors })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GiftDetail = lazy(() =>
  import('./pages/GiftDetail.js').then((m) => ({ default: m.GiftDetail })),
)
const Gifts = lazy(() => import('./pages/Gifts.js').then((m) => ({ default: m.Gifts })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewDonor = lazy(() => import('./pages/NewDonor.js').then((m) => ({ default: m.NewDonor })))
const NewGift = lazy(() => import('./pages/NewGift.js').then((m) => ({ default: m.NewGift })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReceiptDetail = lazy(() =>
  import('./pages/ReceiptDetail.js').then((m) => ({ default: m.ReceiptDetail })),
)
const Receipts = lazy(() => import('./pages/Receipts.js').then((m) => ({ default: m.Receipts })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter
        // Keep this: React Router 8 otherwise changes the URL before the new page renders,
        // so code and tests that check the page right after a navigation see the old one.
        useTransitions={false}
      >
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
                <Route element={<DonorLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/donors" element={<Donors />} />
                  <Route path="/donors/new" element={<NewDonor />} />
                  <Route path="/donors/:id" element={<DonorDetail />} />
                  <Route path="/gifts" element={<Gifts />} />
                  <Route path="/gifts/new" element={<NewGift />} />
                  <Route path="/gifts/:id" element={<GiftDetail />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/receipts" element={<Receipts />} />
                  <Route path="/receipts/:id" element={<ReceiptDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
