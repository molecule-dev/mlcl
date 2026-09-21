import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuctionPlatformLayout } from './components/AuctionPlatformLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { AuctionDetail } from './pages/AuctionDetail.js'
import { BrowseAuctions } from './pages/BrowseAuctions.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyBids } from './pages/MyBids.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SellerDashboard } from './pages/SellerDashboard.js'
import { SellerProfile } from './pages/SellerProfile.js'
import { SellListing } from './pages/SellListing.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Watchlist } from './pages/Watchlist.js'
import { WonAuctionCheckout } from './pages/WonAuctionCheckout.js'
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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
