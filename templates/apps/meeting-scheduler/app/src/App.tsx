import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { MeridianLayout } from './components/MeridianLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Availability = lazy(() =>
  import('./pages/Availability.js').then((m) => ({ default: m.Availability })),
)
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const BookingConfirmation = lazy(() =>
  import('./pages/BookingConfirmation.js').then((m) => ({ default: m.BookingConfirmation })),
)
const BookingPage = lazy(() =>
  import('./pages/BookingPage.js').then((m) => ({ default: m.BookingPage })),
)
const Bookings = lazy(() => import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })))
const Calendar = lazy(() => import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const EventTypeEditor = lazy(() =>
  import('./pages/EventTypeEditor.js').then((m) => ({ default: m.EventTypeEditor })),
)
const EventTypes = lazy(() =>
  import('./pages/EventTypes.js').then((m) => ({ default: m.EventTypes })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Integrations = lazy(() =>
  import('./pages/Integrations.js').then((m) => ({ default: m.Integrations })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MeetingDetail = lazy(() =>
  import('./pages/MeetingDetail.js').then((m) => ({ default: m.MeetingDetail })),
)
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
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
