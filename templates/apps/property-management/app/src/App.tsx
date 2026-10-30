import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PropertyManagementLayout } from './components/PropertyManagementLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Finances = lazy(() => import('./pages/Finances.js').then((m) => ({ default: m.Finances })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const LeaseNew = lazy(() => import('./pages/LeaseNew.js').then((m) => ({ default: m.LeaseNew })))
const Leases = lazy(() => import('./pages/Leases.js').then((m) => ({ default: m.Leases })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Maintenance = lazy(() =>
  import('./pages/Maintenance.js').then((m) => ({ default: m.Maintenance })),
)
const MaintenanceDetail = lazy(() =>
  import('./pages/MaintenanceDetail.js').then((m) => ({ default: m.MaintenanceDetail })),
)
const MaintenanceNew = lazy(() =>
  import('./pages/MaintenanceNew.js').then((m) => ({ default: m.MaintenanceNew })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Properties = lazy(() =>
  import('./pages/Properties.js').then((m) => ({ default: m.Properties })),
)
const PropertyDetail = lazy(() =>
  import('./pages/PropertyDetail.js').then((m) => ({ default: m.PropertyDetail })),
)
const PropertyNew = lazy(() =>
  import('./pages/PropertyNew.js').then((m) => ({ default: m.PropertyNew })),
)
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TenantDetail = lazy(() =>
  import('./pages/TenantDetail.js').then((m) => ({ default: m.TenantDetail })),
)
const TenantNew = lazy(() => import('./pages/TenantNew.js').then((m) => ({ default: m.TenantNew })))
const Tenants = lazy(() => import('./pages/Tenants.js').then((m) => ({ default: m.Tenants })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter
        // Keep this: React Router 8 otherwise changes the URL before the new page renders,
        // so code and tests that check the page right after a navigation see the old one.
        useTransitions={false}
      >
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
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
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
