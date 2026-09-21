import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PropertyManagementLayout } from './components/PropertyManagementLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Dashboard } from './pages/Dashboard.js'
import { Finances } from './pages/Finances.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { LeaseNew } from './pages/LeaseNew.js'
import { Leases } from './pages/Leases.js'
import { Login } from './pages/Login.js'
import { Maintenance } from './pages/Maintenance.js'
import { MaintenanceDetail } from './pages/MaintenanceDetail.js'
import { MaintenanceNew } from './pages/MaintenanceNew.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Properties } from './pages/Properties.js'
import { PropertyDetail } from './pages/PropertyDetail.js'
import { PropertyNew } from './pages/PropertyNew.js'
import { Reports } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TenantDetail } from './pages/TenantDetail.js'
import { TenantNew } from './pages/TenantNew.js'
import { Tenants } from './pages/Tenants.js'
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
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            <Route element={<AuthGuard />}>
              <Route element={<PropertyManagementLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/properties/new" element={<PropertyNew />} />
                <Route path="/properties/:id" element={<PropertyDetail />} />
                <Route path="/tenants" element={<Tenants />} />
                <Route path="/tenants/new" element={<TenantNew />} />
                <Route path="/tenants/:id" element={<TenantDetail />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/maintenance/new" element={<MaintenanceNew />} />
                <Route path="/maintenance/:id" element={<MaintenanceDetail />} />
                <Route path="/leases" element={<Leases />} />
                <Route path="/leases/new" element={<LeaseNew />} />
                <Route path="/finances" element={<Finances />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
