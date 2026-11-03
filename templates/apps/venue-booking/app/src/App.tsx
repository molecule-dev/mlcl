import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AlcoveLayout } from './components/AlcoveLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Account = lazyPage(() => import('./pages/Account.js').then((m) => ({ default: m.Account })))
const Booking = lazyPage(() => import('./pages/Booking.js').then((m) => ({ default: m.Booking })))
const BookingConfirmation = lazyPage(() =>
  import('./pages/BookingConfirmation.js').then((m) => ({ default: m.BookingConfirmation })),
)
const Favorites = lazyPage(() =>
  import('./pages/Favorites.js').then((m) => ({ default: m.Favorites })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const HostDashboard = lazyPage(() =>
  import('./pages/HostDashboard.js').then((m) => ({ default: m.HostDashboard })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
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
const ReservationDetail = lazyPage(() =>
  import('./pages/ReservationDetail.js').then((m) => ({ default: m.ReservationDetail })),
)
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
const VenueDetail = lazyPage(() =>
  import('./pages/VenueDetail.js').then((m) => ({ default: m.VenueDetail })),
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
