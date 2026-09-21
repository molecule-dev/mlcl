import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { MeridianLayout } from './components/MeridianLayout.js'
import { About } from './pages/About.js'
import { Availability } from './pages/Availability.js'
import { Billing } from './pages/Billing.js'
import { BookingConfirmation } from './pages/BookingConfirmation.js'
import { BookingPage } from './pages/BookingPage.js'
import { Bookings } from './pages/Bookings.js'
import { Calendar } from './pages/Calendar.js'
import { Dashboard } from './pages/Dashboard.js'
import { EventTypeEditor } from './pages/EventTypeEditor.js'
import { EventTypes } from './pages/EventTypes.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Integrations } from './pages/Integrations.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MeetingDetail } from './pages/MeetingDetail.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

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
          <AnalyticsRouteListener />
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
