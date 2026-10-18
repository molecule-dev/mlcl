import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NuzzleLayout } from './components/NuzzleLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const BookingDetail = lazy(() =>
  import('./pages/BookingDetail.js').then((m) => ({ default: m.BookingDetail })),
)
const Bookings = lazy(() => import('./pages/Bookings.js').then((m) => ({ default: m.Bookings })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Medications = lazy(() =>
  import('./pages/Medications.js').then((m) => ({ default: m.Medications })),
)
const Messages = lazy(() => import('./pages/Messages.js').then((m) => ({ default: m.Messages })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PetDetail = lazy(() => import('./pages/PetDetail.js').then((m) => ({ default: m.PetDetail })))
const Pets = lazy(() => import('./pages/Pets.js').then((m) => ({ default: m.Pets })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SitterDetail = lazy(() =>
  import('./pages/SitterDetail.js').then((m) => ({ default: m.SitterDetail })),
)
const Sitters = lazy(() => import('./pages/Sitters.js').then((m) => ({ default: m.Sitters })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VetRecordDetail = lazy(() =>
  import('./pages/VetRecordDetail.js').then((m) => ({ default: m.VetRecordDetail })),
)
const VetRecords = lazy(() =>
  import('./pages/VetRecords.js').then((m) => ({ default: m.VetRecords })),
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
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
