import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RoostLayout } from './components/RoostLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const BookingDetail = lazyPage(() =>
  import('./pages/BookingDetail.js').then((m) => ({ default: m.BookingDetail })),
)
const Bookings = lazyPage(() =>
  import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })),
)
const CreateListing = lazyPage(() =>
  import('./pages/CreateListing.js').then((m) => ({ default: m.CreateListing })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const HostDashboard = lazyPage(() =>
  import('./pages/HostDashboard.js').then((m) => ({ default: m.HostDashboard })),
)
const HostListingDetail = lazyPage(() =>
  import('./pages/HostListingDetail.js').then((m) => ({ default: m.HostListingDetail })),
)
const HostListings = lazyPage(() =>
  import('./pages/HostListings.js').then((m) => ({ default: m.HostListings })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const ListingDetail = lazyPage(() =>
  import('./pages/ListingDetail.js').then((m) => ({ default: m.ListingDetail })),
)
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Messages = lazyPage(() =>
  import('./pages/Messages.js').then((m) => ({ default: m.Messages })),
)
const MessageThread = lazyPage(() =>
  import('./pages/MessageThread.js').then((m) => ({ default: m.MessageThread })),
)
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
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reservations = lazyPage(() =>
  import('./pages/Reservations.js').then((m) => ({ default: m.Reservations })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazyPage(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Wishlist = lazyPage(() =>
  import('./pages/Wishlist.js').then((m) => ({ default: m.Wishlist })),
)

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
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
