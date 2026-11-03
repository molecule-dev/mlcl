import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WaypointLayout } from './components/WaypointLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Bookings = lazyPage(() =>
  import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })),
)
const Calendar = lazyPage(() =>
  import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Destinations = lazyPage(() =>
  import('./pages/Destinations.js').then((m) => ({ default: m.Destinations })),
)
const Expenses = lazyPage(() =>
  import('./pages/Expenses.js').then((m) => ({ default: m.Expenses })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TripDetail = lazyPage(() =>
  import('./pages/TripDetail.js').then((m) => ({ default: m.TripDetail })),
)
const TripPlanner = lazyPage(() =>
  import('./pages/TripPlanner.js').then((m) => ({ default: m.TripPlanner })),
)
const Trips = lazyPage(() => import('./pages/Trips.js').then((m) => ({ default: m.Trips })))

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
