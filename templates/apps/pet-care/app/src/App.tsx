import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NuzzleLayout } from './components/NuzzleLayout.js'
import { About } from './pages/About.js'
import { BookingDetail } from './pages/BookingDetail.js'
import { Bookings } from './pages/Bookings.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Medications } from './pages/Medications.js'
import { Messages } from './pages/Messages.js'
import { Notifications } from './pages/Notifications.js'
import { PetDetail } from './pages/PetDetail.js'
import { Pets } from './pages/Pets.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SitterDetail } from './pages/SitterDetail.js'
import { Sitters } from './pages/Sitters.js'
import { Terms } from './pages/Terms.js'
import { VetRecordDetail } from './pages/VetRecordDetail.js'
import { VetRecords } from './pages/VetRecords.js'

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
        <AnalyticsRouteListener />
        <Routes>
          {/* Public marketing + auth */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Authenticated app shell — sidebar nav + outlet */}
          <Route element={<AuthGuard />}>
            <Route element={<NuzzleLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pets" element={<Pets />} />
              <Route path="/pets/:id" element={<PetDetail />} />
              <Route path="/sitters" element={<Sitters />} />
              <Route path="/sitters/:id" element={<SitterDetail />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/vet-records" element={<VetRecords />} />
              <Route path="/vet-records/:id" element={<VetRecordDetail />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
