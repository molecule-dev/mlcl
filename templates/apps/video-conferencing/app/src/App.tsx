import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { VideoConferencingLayout } from './components/VideoConferencingLayout.js'
import { About } from './pages/About.js'
import { Billing } from './pages/Billing.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Lobby } from './pages/Lobby.js'
import { Login } from './pages/Login.js'
import { Meeting } from './pages/Meeting.js'
import { MeetingDetail } from './pages/MeetingDetail.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { Privacy } from './pages/Privacy.js'
import { RecordingDetail } from './pages/RecordingDetail.js'
import { Recordings } from './pages/Recordings.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Schedule } from './pages/Schedule.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TeamMembers } from './pages/TeamMembers.js'
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
