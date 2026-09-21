import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WeddingLayout } from './components/WeddingLayout.js'
import { About } from './pages/About.js'
import { Budget } from './pages/Budget.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Guests } from './pages/Guests.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Rsvp } from './pages/Rsvp.js'
import { SeatingChart } from './pages/SeatingChart.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Tasks } from './pages/Tasks.js'
import { Terms } from './pages/Terms.js'
import { Vendors } from './pages/Vendors.js'

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            {/*
              Public RSVP collection surface: guests confirm by code — no
              account, no email. The page finds the guest by name inside the
              wedding keyed by :code and records their response directly.
            */}
            <Route path="/rsvp/:code" element={<Rsvp />} />
            <Route element={<AuthGuard />}>
              <Route element={<WeddingLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/guests" element={<Guests />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/vendors" element={<Vendors />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/seating" element={<SeatingChart />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
