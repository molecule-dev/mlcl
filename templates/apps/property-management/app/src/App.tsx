import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PropertyManagementLayout } from './components/PropertyManagementLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Finances = lazyPage(() =>
  import('./pages/Finances.js').then((m) => ({ default: m.Finances })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const LeaseNew = lazyPage(() =>
  import('./pages/LeaseNew.js').then((m) => ({ default: m.LeaseNew })),
)
const Leases = lazyPage(() => import('./pages/Leases.js').then((m) => ({ default: m.Leases })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Maintenance = lazyPage(() =>
  import('./pages/Maintenance.js').then((m) => ({ default: m.Maintenance })),
)
const MaintenanceDetail = lazyPage(() =>
  import('./pages/MaintenanceDetail.js').then((m) => ({ default: m.MaintenanceDetail })),
)
const MaintenanceNew = lazyPage(() =>
  import('./pages/MaintenanceNew.js').then((m) => ({ default: m.MaintenanceNew })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Properties = lazyPage(() =>
  import('./pages/Properties.js').then((m) => ({ default: m.Properties })),
)
const PropertyDetail = lazyPage(() =>
  import('./pages/PropertyDetail.js').then((m) => ({ default: m.PropertyDetail })),
)
const PropertyNew = lazyPage(() =>
  import('./pages/PropertyNew.js').then((m) => ({ default: m.PropertyNew })),
)
const Reports = lazyPage(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TenantDetail = lazyPage(() =>
  import('./pages/TenantDetail.js').then((m) => ({ default: m.TenantDetail })),
)
const TenantNew = lazyPage(() =>
  import('./pages/TenantNew.js').then((m) => ({ default: m.TenantNew })),
)
const Tenants = lazyPage(() => import('./pages/Tenants.js').then((m) => ({ default: m.Tenants })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
