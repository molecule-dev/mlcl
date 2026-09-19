import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SwitchboardLayout } from './components/SwitchboardLayout.js'
import { Account } from './pages/Account.js'
import { CallDetail } from './pages/CallDetail.js'
import { Calls } from './pages/Calls.js'
import { CallSimulator } from './pages/CallSimulator.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GuestDetail } from './pages/GuestDetail.js'
import { Guests } from './pages/Guests.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewReservation } from './pages/NewReservation.js'
import { NotFound } from './pages/NotFound.js'
import { Privacy } from './pages/Privacy.js'
import { ReservationDetail } from './pages/ReservationDetail.js'
import { Reservations } from './pages/Reservations.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RoomsRates } from './pages/RoomsRates.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { VoiceAgents } from './pages/VoiceAgents.js'

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
