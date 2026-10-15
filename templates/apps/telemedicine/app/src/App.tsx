import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SolaceLayout } from './components/SolaceLayout.js'
import { About } from './pages/About.js'
import { AppointmentDetail } from './pages/AppointmentDetail.js'
import { Appointments } from './pages/Appointments.js'
import { BookAppointmentPage } from './pages/BookAppointment.js'
import { Consult } from './pages/Consult.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MedicalRecords } from './pages/MedicalRecords.js'
import { Messages } from './pages/Messages.js'
import { Notifications } from './pages/Notifications.js'
import { PatientDetail } from './pages/PatientDetail.js'
import { Patients } from './pages/Patients.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Prescriptions } from './pages/Prescriptions.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Providers } from './pages/Providers.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/providers" element={<Providers />} />
            <Route element={<AuthGuard />}>
              <Route element={<SolaceLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/appointments" element={<Appointments />} />
                <Route path="/appointments/new" element={<BookAppointmentPage />} />
                <Route path="/appointments/:id" element={<AppointmentDetail />} />
                <Route path="/providers/:id/book" element={<BookAppointmentPage />} />
                <Route path="/consult/:id" element={<Consult />} />
                <Route path="/patients" element={<Patients />} />
                <Route path="/patients/:id" element={<PatientDetail />} />
                <Route path="/records" element={<MedicalRecords />} />
                <Route path="/prescriptions" element={<Prescriptions />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
