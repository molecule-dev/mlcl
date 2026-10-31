import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuctionPlatformLayout } from './components/AuctionPlatformLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AuctionDetail = lazyPage(() =>
  import('./pages/AuctionDetail.js').then((m) => ({ default: m.AuctionDetail })),
)
const BrowseAuctions = lazyPage(() =>
  import('./pages/BrowseAuctions.js').then((m) => ({ default: m.BrowseAuctions })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyBids = lazyPage(() => import('./pages/MyBids.js').then((m) => ({ default: m.MyBids })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SellerDashboard = lazyPage(() =>
  import('./pages/SellerDashboard.js').then((m) => ({ default: m.SellerDashboard })),
)
const SellerProfile = lazyPage(() =>
  import('./pages/SellerProfile.js').then((m) => ({ default: m.SellerProfile })),
)
const SellListing = lazyPage(() =>
  import('./pages/SellListing.js').then((m) => ({ default: m.SellListing })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Watchlist = lazyPage(() =>
  import('./pages/Watchlist.js').then((m) => ({ default: m.Watchlist })),
)
const WonAuctionCheckout = lazyPage(() =>
  import('./pages/WonAuctionCheckout.js').then((m) => ({ default: m.WonAuctionCheckout })),
)
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
