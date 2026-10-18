import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FlightSearchLayout } from './components/FlightSearchLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Booking = lazy(() => import('./pages/Booking.js').then((m) => ({ default: m.Booking })))
const FlightDetail = lazy(() =>
  import('./pages/FlightDetail.js').then((m) => ({ default: m.FlightDetail })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PriceAlerts = lazy(() =>
  import('./pages/PriceAlerts.js').then((m) => ({ default: m.PriceAlerts })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Results = lazy(() => import('./pages/Results.js').then((m) => ({ default: m.Results })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TripDetail = lazy(() =>
  import('./pages/TripDetail.js').then((m) => ({ default: m.TripDetail })),
)
const Trips = lazy(() => import('./pages/Trips.js').then((m) => ({ default: m.Trips })))

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

              {/* Authenticated routes wrapped in FlightSearchLayout */}
              <Route element={<AuthGuard />}>
                <Route element={<FlightSearchLayout />}>
                  <Route path="/search" element={<Results />} />
                  <Route path="/flight/:id" element={<FlightDetail />} />
                  <Route path="/book/:id" element={<Booking />} />
                  <Route path="/trips" element={<Trips />} />
                  <Route path="/trips/:id" element={<TripDetail />} />
                  <Route path="/alerts" element={<PriceAlerts />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
