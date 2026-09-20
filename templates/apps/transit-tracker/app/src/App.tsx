import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { TransitLayout } from './components/TransitLayout.js'
import { About } from './pages/About.js'
import { Alerts } from './pages/Alerts.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Nearby } from './pages/Nearby.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RouteDetail } from './pages/RouteDetail.js'
import { SavedStops } from './pages/SavedStops.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { StopBoard } from './pages/StopBoard.js'
import { Terms } from './pages/Terms.js'
import { TripPlanner } from './pages/TripPlanner.js'

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
          <Routes>
            {/* Public routes (no auth) */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Authenticated routes wrapped in TransitLayout */}
            <Route element={<AuthGuard />}>
              <Route element={<TransitLayout />}>
                <Route path="/nearby" element={<Nearby />} />
                <Route path="/stops/:code" element={<StopBoard />} />
                <Route path="/lines/:code" element={<RouteDetail />} />
                <Route path="/plan" element={<TripPlanner />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/saved" element={<SavedStops />} />
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
