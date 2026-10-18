import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SwitchboardLayout } from './components/SwitchboardLayout.js'

const Account = lazy(() => import('./pages/Account.js').then((m) => ({ default: m.Account })))
const CallDetail = lazy(() =>
  import('./pages/CallDetail.js').then((m) => ({ default: m.CallDetail })),
)
const Calls = lazy(() => import('./pages/Calls.js').then((m) => ({ default: m.Calls })))
const CallSimulator = lazy(() =>
  import('./pages/CallSimulator.js').then((m) => ({ default: m.CallSimulator })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GuestDetail = lazy(() =>
  import('./pages/GuestDetail.js').then((m) => ({ default: m.GuestDetail })),
)
const Guests = lazy(() => import('./pages/Guests.js').then((m) => ({ default: m.Guests })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewReservation = lazy(() =>
  import('./pages/NewReservation.js').then((m) => ({ default: m.NewReservation })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReservationDetail = lazy(() =>
  import('./pages/ReservationDetail.js').then((m) => ({ default: m.ReservationDetail })),
)
const Reservations = lazy(() =>
  import('./pages/Reservations.js').then((m) => ({ default: m.Reservations })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RoomsRates = lazy(() =>
  import('./pages/RoomsRates.js').then((m) => ({ default: m.RoomsRates })),
)
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VoiceAgents = lazy(() =>
  import('./pages/VoiceAgents.js').then((m) => ({ default: m.VoiceAgents })),
)

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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authenticated routes (staff workspace) */}
              <Route element={<AuthGuard />}>
                <Route element={<SwitchboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/reservations" element={<Reservations />} />
                  <Route path="/reservations/new" element={<NewReservation />} />
                  <Route path="/reservations/:id" element={<ReservationDetail />} />
                  <Route path="/rooms" element={<RoomsRates />} />
                  <Route path="/guests" element={<Guests />} />
                  <Route path="/guests/:id" element={<GuestDetail />} />
                  <Route path="/voice-agents" element={<VoiceAgents />} />
                  <Route path="/calls" element={<Calls />} />
                  <Route path="/calls/:id" element={<CallDetail />} />
                  <Route path="/simulator" element={<CallSimulator />} />
                  <Route path="/account" element={<Account />} />
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
