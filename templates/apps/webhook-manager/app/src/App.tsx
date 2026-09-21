import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PylonShell } from './components/PylonShell.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { APIKeys } from './pages/APIKeys.js'
import { AuditLog } from './pages/AuditLog.js'
import { Billing } from './pages/Billing.js'
import { Dashboard } from './pages/Dashboard.js'
import { Deliveries } from './pages/Deliveries.js'
import { DeliveryDetail } from './pages/DeliveryDetail.js'
import { EndpointDetail } from './pages/EndpointDetail.js'
import { Endpoints } from './pages/Endpoints.js'
import { EventDetail } from './pages/EventDetail.js'
import { Events } from './pages/Events.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewEndpoint } from './pages/NewEndpoint.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'

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
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              <Route element={<PylonShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/endpoints" element={<Endpoints />} />
                <Route path="/endpoints/new" element={<NewEndpoint />} />
                <Route path="/endpoints/:id" element={<EndpointDetail />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/deliveries/:id" element={<DeliveryDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/api-keys" element={<APIKeys />} />
                <Route path="/settings/team" element={<Team />} />
                <Route path="/settings/billing" element={<Billing />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
