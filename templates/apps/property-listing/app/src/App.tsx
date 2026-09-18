import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { About } from './pages/About.js'
import { AgentAnalyticsPage } from './pages/AgentAnalyticsPage.js'
import { AgentDashboard } from './pages/AgentDashboard.js'
import { AgentLeadsPage } from './pages/AgentLeadsPage.js'
import { AgentListingsPage } from './pages/AgentListingsPage.js'
import { AgentProfilePage } from './pages/AgentProfilePage.js'
import { AgentShowingsPage } from './pages/AgentShowingsPage.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { ListingEditorPage } from './pages/ListingEditorPage.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { PropertyDetailPage } from './pages/PropertyDetailPage.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SavedPropertiesPage } from './pages/SavedPropertiesPage.js'
import { SearchPage } from './pages/SearchPage.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
function PropertyDetailRoute() {
  return <PropertyDetailPage />
}

function AgentProfileRoute() {
  return <AgentProfilePage />
}

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
        <AnalyticsRouteListener />
        <RootErrorBoundary>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public property browsing */}
            <Route index element={<SearchPage />} />
            <Route path="/property/:id" element={<PropertyDetailRoute />} />
            <Route path="/agent/:id" element={<AgentProfileRoute />} />
            <Route path="/saved" element={<SavedPropertiesPage />} />

            {/* Authenticated agent/admin routes */}
            <Route element={<AuthGuard />}>
              <Route path="/admin" element={<AgentDashboard />} />
              <Route path="/admin/dashboard" element={<AgentDashboard />} />
              <Route path="/admin/listings" element={<AgentListingsPage />} />
              <Route path="/admin/listings/new" element={<ListingEditorPage />} />
              <Route path="/admin/listings/:id/edit" element={<ListingEditorPage />} />
              <Route path="/admin/leads" element={<AgentLeadsPage />} />
              <Route path="/admin/showings" element={<AgentShowingsPage />} />
              <Route path="/admin/analytics" element={<AgentAnalyticsPage />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Fallback */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
