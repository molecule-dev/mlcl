import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WaypointLayout } from './components/WaypointLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Bookings = lazy(() => import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })))
const Calendar = lazy(() => import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Destinations = lazy(() =>
  import('./pages/Destinations.js').then((m) => ({ default: m.Destinations })),
)
const Expenses = lazy(() => import('./pages/Expenses.js').then((m) => ({ default: m.Expenses })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TripDetail = lazy(() =>
  import('./pages/TripDetail.js').then((m) => ({ default: m.TripDetail })),
)
const TripPlanner = lazy(() =>
  import('./pages/TripPlanner.js').then((m) => ({ default: m.TripPlanner })),
)
const Trips = lazy(() => import('./pages/Trips.js').then((m) => ({ default: m.Trips })))

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
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authenticated routes — wrapped in WaypointLayout via AuthGuard */}
              <Route element={<AuthGuard />}>
                <Route element={<WaypointLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/trips/new" element={<TripPlanner />} />
                  <Route path="/trips/:id" element={<TripDetail />} />
                  <Route path="/destinations" element={<Destinations />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/expenses" element={<Expenses />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
