import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { StatusPageLayout } from './components/StatusPageLayout.js'
import { About } from './pages/About.js'
import { AuditLog } from './pages/AuditLog.js'
import { ComponentDetail } from './pages/ComponentDetail.js'
import { Components } from './pages/Components.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { IncidentDetail } from './pages/IncidentDetail.js'
import { IncidentForm } from './pages/IncidentForm.js'
import { IncidentList } from './pages/IncidentList.js'
import { Login } from './pages/Login.js'
import { MaintenanceDetail } from './pages/MaintenanceDetail.js'
import { MaintenanceList } from './pages/MaintenanceList.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { PublicStatusPage } from './pages/PublicStatus.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Subscribers } from './pages/Subscribers.js'
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
        <Routes>
          {/* Public routes — full-bleed marketing/auth surfaces. */}
          <Route path="/" element={<PublicStatusPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Authed routes — sidebar shell wrapping every operator screen. */}
          <Route element={<AuthGuard />}>
            <Route element={<StatusPageLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/incidents" element={<IncidentList />} />
              <Route path="/incidents/new" element={<IncidentForm />} />
              <Route path="/incidents/:id" element={<IncidentDetail />} />
              <Route path="/components" element={<Components />} />
              <Route path="/components/:id" element={<ComponentDetail />} />
              <Route path="/maintenance" element={<MaintenanceList />} />
              <Route path="/maintenance/:id" element={<MaintenanceDetail />} />
              <Route path="/subscribers" element={<Subscribers />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/team" element={<Team />} />
              <Route path="/audit" element={<AuditLog />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/plan-updated" element={<PlanUpdated />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
