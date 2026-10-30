import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RoostLayout } from './components/RoostLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const BookingDetail = lazy(() =>
  import('./pages/BookingDetail.js').then((m) => ({ default: m.BookingDetail })),
)
const Bookings = lazy(() => import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })))
const CreateListing = lazy(() =>
  import('./pages/CreateListing.js').then((m) => ({ default: m.CreateListing })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const HostDashboard = lazy(() =>
  import('./pages/HostDashboard.js').then((m) => ({ default: m.HostDashboard })),
)
const HostListingDetail = lazy(() =>
  import('./pages/HostListingDetail.js').then((m) => ({ default: m.HostListingDetail })),
)
const HostListings = lazy(() =>
  import('./pages/HostListings.js').then((m) => ({ default: m.HostListings })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const ListingDetail = lazy(() =>
  import('./pages/ListingDetail.js').then((m) => ({ default: m.ListingDetail })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Messages = lazy(() => import('./pages/Messages.js').then((m) => ({ default: m.Messages })))
const MessageThread = lazy(() =>
  import('./pages/MessageThread.js').then((m) => ({ default: m.MessageThread })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reservations = lazy(() =>
  import('./pages/Reservations.js').then((m) => ({ default: m.Reservations })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Wishlist = lazy(() => import('./pages/Wishlist.js').then((m) => ({ default: m.Wishlist })))

export function App() {
  return (
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
