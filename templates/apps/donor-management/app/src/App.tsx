import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DonorLayout } from './components/DonorLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Campaigns = lazyPage(() =>
  import('./pages/Campaigns.js').then((m) => ({ default: m.Campaigns })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const DonorDetail = lazyPage(() =>
  import('./pages/DonorDetail.js').then((m) => ({ default: m.DonorDetail })),
)
const Donors = lazyPage(() => import('./pages/Donors.js').then((m) => ({ default: m.Donors })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GiftDetail = lazyPage(() =>
  import('./pages/GiftDetail.js').then((m) => ({ default: m.GiftDetail })),
)
const Gifts = lazyPage(() => import('./pages/Gifts.js').then((m) => ({ default: m.Gifts })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewDonor = lazyPage(() =>
  import('./pages/NewDonor.js').then((m) => ({ default: m.NewDonor })),
)
const NewGift = lazyPage(() => import('./pages/NewGift.js').then((m) => ({ default: m.NewGift })))
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReceiptDetail = lazyPage(() =>
  import('./pages/ReceiptDetail.js').then((m) => ({ default: m.ReceiptDetail })),
)
const Receipts = lazyPage(() =>
  import('./pages/Receipts.js').then((m) => ({ default: m.Receipts })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
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
