import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { MeridianLayout } from './components/MeridianLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Availability = lazyPage(() =>
  import('./pages/Availability.js').then((m) => ({ default: m.Availability })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const BookingConfirmation = lazyPage(() =>
  import('./pages/BookingConfirmation.js').then((m) => ({ default: m.BookingConfirmation })),
)
const BookingPage = lazyPage(() =>
  import('./pages/BookingPage.js').then((m) => ({ default: m.BookingPage })),
)
const Bookings = lazyPage(() =>
  import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })),
)
const Calendar = lazyPage(() =>
  import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const EventTypeEditor = lazyPage(() =>
  import('./pages/EventTypeEditor.js').then((m) => ({ default: m.EventTypeEditor })),
)
const EventTypes = lazyPage(() =>
  import('./pages/EventTypes.js').then((m) => ({ default: m.EventTypes })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Integrations = lazyPage(() =>
  import('./pages/Integrations.js').then((m) => ({ default: m.Integrations })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MeetingDetail = lazyPage(() =>
  import('./pages/MeetingDetail.js').then((m) => ({ default: m.MeetingDetail })),
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
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
              {/* Public marketing + auth routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Public booking flow — shareable links */}
              <Route path="/book/:slug" element={<BookingPage />} />
              <Route path="/book/:slug/confirmed" element={<BookingConfirmation />} />

              {/* Authenticated app — wrapped in MeridianLayout sidebar */}
              <Route element={<AuthGuard />}>
                <Route element={<MeridianLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/event-types" element={<EventTypes />} />
                  <Route path="/event-types/:id" element={<EventTypeEditor />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/bookings/:id" element={<MeetingDetail />} />
                  <Route path="/availability" element={<Availability />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
