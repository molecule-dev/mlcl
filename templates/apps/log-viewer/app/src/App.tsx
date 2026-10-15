import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SignalinkLayout } from './components/SignalinkLayout.js'
import { About } from './pages/About.js'
import { AlertDetail } from './pages/AlertDetail.js'
import { Alerts } from './pages/Alerts.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { IncidentDetail } from './pages/IncidentDetail.js'
import { Incidents } from './pages/Incidents.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Saved } from './pages/Saved.js'
import { Search } from './pages/Search.js'
import { Services } from './pages/Services.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { StreamDetail } from './pages/StreamDetail.js'
import { Streams } from './pages/Streams.js'
import { Terms } from './pages/Terms.js'
import { TraceDetail } from './pages/TraceDetail.js'
import { Traces } from './pages/Traces.js'

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
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Authenticated */}
            <Route element={<AuthGuard />}>
              <Route element={<SignalinkLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/traces" element={<Traces />} />
                <Route path="/traces/:id" element={<TraceDetail />} />
                <Route path="/streams" element={<Streams />} />
                <Route path="/streams/:id" element={<StreamDetail />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/alerts/:id" element={<AlertDetail />} />
                <Route path="/incidents" element={<Incidents />} />
                <Route path="/incidents/:id" element={<IncidentDetail />} />
                <Route path="/services" element={<Services />} />
                <Route path="/saved" element={<Saved />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
