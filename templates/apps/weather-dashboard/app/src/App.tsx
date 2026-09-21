import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WeatherDashboardLayout } from './components/WeatherDashboardLayout.js'
import { About } from './pages/About.js'
import { Alerts } from './pages/Alerts.js'
import { Billing } from './pages/Billing.js'
import { Compare } from './pages/Compare.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { LocationDetail } from './pages/LocationDetail.js'
import { Locations } from './pages/Locations.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { Radar } from './pages/Radar.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Trends } from './pages/Trends.js'

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
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AuthGuard />}>
              <Route element={<WeatherDashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/location/:id" element={<LocationDetail />} />
                <Route path="/radar" element={<Radar />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
