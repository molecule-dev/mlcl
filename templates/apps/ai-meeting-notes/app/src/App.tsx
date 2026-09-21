import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MurmurLayout } from './components/MurmurLayout.js'
import { About } from './pages/About.js'
import { ActionItems } from './pages/ActionItems.js'
import { Calendar } from './pages/Calendar.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Integrations } from './pages/Integrations.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MeetingDetail } from './pages/MeetingDetail.js'
import { Meetings } from './pages/Meetings.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Record } from './pages/Record.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
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
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AuthGuard />}>
              <Route element={<MurmurLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/meetings/:id" element={<MeetingDetail />} />
                <Route path="/record" element={<Record />} />
                <Route path="/actions" element={<ActionItems />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/team" element={<Team />} />
                <Route path="/search" element={<Search />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
