import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AlcoveLayout } from './components/AlcoveLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Account } from './pages/Account.js'
import { Booking } from './pages/Booking.js'
import { BookingConfirmation } from './pages/BookingConfirmation.js'
import { Favorites } from './pages/Favorites.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { HostDashboard } from './pages/HostDashboard.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Messages } from './pages/Messages.js'
import { MessageThread } from './pages/MessageThread.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ReservationDetail } from './pages/ReservationDetail.js'
import { Reservations } from './pages/Reservations.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { VenueDetail } from './pages/VenueDetail.js'

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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<AuthGuard />}>
              <Route element={<AlcoveLayout />}>
                <Route path="/search" element={<Search />} />
                <Route path="/venue/:id" element={<VenueDetail />} />
                <Route path="/book/:venueId" element={<Booking />} />
                <Route path="/booking/confirmation/:id" element={<BookingConfirmation />} />
                <Route path="/reservations" element={<Reservations />} />
                <Route path="/reservations/:id" element={<ReservationDetail />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/messages/:id" element={<MessageThread />} />
                <Route path="/host" element={<HostDashboard />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/account" element={<Account />} />
                <Route path="/settings" element={<Settings />} />
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
