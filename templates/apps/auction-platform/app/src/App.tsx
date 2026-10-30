import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuctionPlatformLayout } from './components/AuctionPlatformLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AuctionDetail = lazy(() =>
  import('./pages/AuctionDetail.js').then((m) => ({ default: m.AuctionDetail })),
)
const BrowseAuctions = lazy(() =>
  import('./pages/BrowseAuctions.js').then((m) => ({ default: m.BrowseAuctions })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyBids = lazy(() => import('./pages/MyBids.js').then((m) => ({ default: m.MyBids })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SellerDashboard = lazy(() =>
  import('./pages/SellerDashboard.js').then((m) => ({ default: m.SellerDashboard })),
)
const SellerProfile = lazy(() =>
  import('./pages/SellerProfile.js').then((m) => ({ default: m.SellerProfile })),
)
const SellListing = lazy(() =>
  import('./pages/SellListing.js').then((m) => ({ default: m.SellListing })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Watchlist = lazy(() => import('./pages/Watchlist.js').then((m) => ({ default: m.Watchlist })))
const WonAuctionCheckout = lazy(() =>
  import('./pages/WonAuctionCheckout.js').then((m) => ({ default: m.WonAuctionCheckout })),
)
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
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route element={<AuthGuard />}>
                <Route element={<AuctionPlatformLayout />}>
                  <Route path="/auctions" element={<BrowseAuctions />} />
                  <Route path="/auctions/:id" element={<AuctionDetail />} />
                  <Route path="/my-bids" element={<MyBids />} />
                  <Route path="/my-bids/won/:id/checkout" element={<WonAuctionCheckout />} />
                  <Route path="/sell/new" element={<SellListing />} />
                  <Route path="/watchlist" element={<Watchlist />} />
                  <Route path="/seller" element={<SellerDashboard />} />
                  <Route path="/sellers/:handle" element={<SellerProfile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
