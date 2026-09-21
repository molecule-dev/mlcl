import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RoostLayout } from './components/RoostLayout.js'
import { About } from './pages/About.js'
import { BookingDetail } from './pages/BookingDetail.js'
import { Bookings } from './pages/Bookings.js'
import { CreateListing } from './pages/CreateListing.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { HostDashboard } from './pages/HostDashboard.js'
import { HostListingDetail } from './pages/HostListingDetail.js'
import { HostListings } from './pages/HostListings.js'
import { Landing } from './pages/Landing.js'
import { ListingDetail } from './pages/ListingDetail.js'
import { Login } from './pages/Login.js'
import { Messages } from './pages/Messages.js'
import { MessageThread } from './pages/MessageThread.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Reservations } from './pages/Reservations.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Wishlist } from './pages/Wishlist.js'

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
          <Routes>
            {/* Public routes (no auth) */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Authenticated routes — wrapped in RoostLayout via AuthGuard */}
            <Route element={<AuthGuard />}>
              <Route element={<RoostLayout />}>
                <Route path="/search" element={<Search />} />
                <Route path="/listings/:id" element={<ListingDetail />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/host" element={<HostDashboard />} />
                <Route path="/host/listings" element={<HostListings />} />
                <Route path="/host/listings/new" element={<CreateListing />} />
                <Route path="/host/listings/:id" element={<HostListingDetail />} />
                <Route path="/host/reservations" element={<Reservations />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<MessageThread />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/users/:id" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
