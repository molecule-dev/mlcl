import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { VideoConferencingLayout } from './components/VideoConferencingLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Lobby = lazyPage(() => import('./pages/Lobby.js').then((m) => ({ default: m.Lobby })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Meeting = lazyPage(() => import('./pages/Meeting.js').then((m) => ({ default: m.Meeting })))
const MeetingDetail = lazyPage(() =>
  import('./pages/MeetingDetail.js').then((m) => ({ default: m.MeetingDetail })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const RecordingDetail = lazyPage(() =>
  import('./pages/RecordingDetail.js').then((m) => ({ default: m.RecordingDetail })),
)
const Recordings = lazyPage(() =>
  import('./pages/Recordings.js').then((m) => ({ default: m.Recordings })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Schedule = lazyPage(() =>
  import('./pages/Schedule.js').then((m) => ({ default: m.Schedule })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TeamMembers = lazyPage(() =>
  import('./pages/TeamMembers.js').then((m) => ({ default: m.TeamMembers })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Authenticated routes */}
              <Route element={<AuthGuard />}>
                {/* Full-bleed dark routes (no shell) */}
                <Route path="/meeting/:id/lobby" element={<Lobby />} />
                <Route path="/meeting/:id" element={<Meeting />} />

                {/* Shell-wrapped routes */}
                <Route element={<VideoConferencingLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/recordings" element={<Recordings />} />
                  <Route path="/recordings/:id" element={<RecordingDetail />} />
                  <Route path="/meeting/:id/details" element={<MeetingDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/team-members" element={<TeamMembers />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/billing" element={<Billing />} />
                </Route>
              </Route>

              {/* Catchall */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
