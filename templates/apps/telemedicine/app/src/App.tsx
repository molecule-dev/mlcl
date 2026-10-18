import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SolaceLayout } from './components/SolaceLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AppointmentDetail = lazy(() =>
  import('./pages/AppointmentDetail.js').then((m) => ({ default: m.AppointmentDetail })),
)
const Appointments = lazy(() =>
  import('./pages/Appointments.js').then((m) => ({ default: m.Appointments })),
)
const BookAppointmentPage = lazy(() =>
  import('./pages/BookAppointment.js').then((m) => ({ default: m.BookAppointmentPage })),
)
const Consult = lazy(() => import('./pages/Consult.js').then((m) => ({ default: m.Consult })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MedicalRecords = lazy(() =>
  import('./pages/MedicalRecords.js').then((m) => ({ default: m.MedicalRecords })),
)
const Messages = lazy(() => import('./pages/Messages.js').then((m) => ({ default: m.Messages })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PatientDetail = lazy(() =>
  import('./pages/PatientDetail.js').then((m) => ({ default: m.PatientDetail })),
)
const Patients = lazy(() => import('./pages/Patients.js').then((m) => ({ default: m.Patients })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Prescriptions = lazy(() =>
  import('./pages/Prescriptions.js').then((m) => ({ default: m.Prescriptions })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Providers = lazy(() => import('./pages/Providers.js').then((m) => ({ default: m.Providers })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
