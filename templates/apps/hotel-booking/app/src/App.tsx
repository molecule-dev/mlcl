import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SojournLayout } from './components/SojournLayout.js'
import { About } from './pages/About.js'
import { Account } from './pages/Account.js'
import { BookingCheckout } from './pages/BookingCheckout.js'
import { BookingConfirmation } from './pages/BookingConfirmation.js'
import { Favorites } from './pages/Favorites.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { PropertyDetail } from './pages/PropertyDetail.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SearchResults } from './pages/SearchResults.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TripDetail } from './pages/TripDetail.js'
import { Trips } from './pages/Trips.js'
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

            {/* Public-but-shelled routes — search/property browsable without login */}
            <Route element={<SojournLayout />}>
              <Route path="/search" element={<SearchResults />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
            </Route>

            {/* Authenticated routes (wrapped in SojournLayout via AuthGuard) */}
            <Route element={<AuthGuard />}>
              <Route element={<SojournLayout />}>
                <Route path="/booking/:id" element={<BookingCheckout />} />
                <Route path="/booking/:id/confirmation" element={<BookingConfirmation />} />
                <Route path="/trips" element={<Trips />} />
                <Route path="/trips/:id" element={<TripDetail />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/account" element={<Account />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
