import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Account = lazy(() => import('./pages/Account.js').then((m) => ({ default: m.Account })))
const BecomeTutor = lazy(() =>
  import('./pages/BecomeTutor.js').then((m) => ({ default: m.BecomeTutor })),
)
const Booking = lazy(() => import('./pages/Booking.js').then((m) => ({ default: m.Booking })))
const BookingConfirmation = lazy(() =>
  import('./pages/BookingConfirmation.js').then((m) => ({ default: m.BookingConfirmation })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Messages = lazy(() => import('./pages/Messages.js').then((m) => ({ default: m.Messages })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const SessionDetail = lazy(() =>
  import('./pages/SessionDetail.js').then((m) => ({ default: m.SessionDetail })),
)
const Sessions = lazy(() => import('./pages/Sessions.js').then((m) => ({ default: m.Sessions })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TutorDashboard = lazy(() =>
  import('./pages/TutorDashboard.js').then((m) => ({ default: m.TutorDashboard })),
)
const TutorProfile = lazy(() =>
  import('./pages/TutorProfile.js').then((m) => ({ default: m.TutorProfile })),
)

export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              <Route element={<AppLayout />}>
                <Route path="/search" element={<Search />} />
                <Route path="/tutor/:id" element={<TutorProfile />} />
                <Route path="/book/:tutorId" element={<Booking />} />
              </Route>

              <Route element={<AuthGuard />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<TutorDashboard />} />
                  <Route path="/book/:tutorId/confirm" element={<BookingConfirmation />} />
                  <Route path="/sessions" element={<Sessions />} />
                  <Route path="/sessions/:id" element={<SessionDetail />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/become-tutor" element={<BecomeTutor />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
