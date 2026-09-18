import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WaypointLayout } from './components/WaypointLayout.js'
import { About } from './pages/About.js'
import { Bookings } from './pages/Bookings.js'
import { Calendar } from './pages/Calendar.js'
import { Dashboard } from './pages/Dashboard.js'
import { Destinations } from './pages/Destinations.js'
import { Expenses } from './pages/Expenses.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TripDetail } from './pages/TripDetail.js'
import { TripPlanner } from './pages/TripPlanner.js'
import { Trips } from './pages/Trips.js'

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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
