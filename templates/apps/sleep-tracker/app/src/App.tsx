import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { SleepTrackerLayout } from './components/SleepTrackerLayout.js'
import { About } from './pages/About.js'
import { Coaching } from './pages/Coaching.js'
import { CoachingDetail } from './pages/CoachingDetail.js'
import { Dashboard } from './pages/Dashboard.js'
import { Devices } from './pages/Devices.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Night } from './pages/Night.js'
import { NightHistory } from './pages/NightHistory.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SmartAlarm } from './pages/SmartAlarm.js'
import { Terms } from './pages/Terms.js'
import { Trends } from './pages/Trends.js'

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
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AuthGuard />}>
              <Route element={<SleepTrackerLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/night/:date" element={<Night />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/history" element={<NightHistory />} />
                <Route path="/coaching" element={<Coaching />} />
                <Route path="/coaching/:id" element={<CoachingDetail />} />
                <Route path="/alarm" element={<SmartAlarm />} />
                <Route path="/devices" element={<Devices />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
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
