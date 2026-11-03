import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WaypointLayout } from './components/WaypointLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Alerts = lazyPage(() => import('./pages/Alerts.js').then((m) => ({ default: m.Alerts })))
const Analytics = lazyPage(() =>
  import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })),
)
const CarrierDetail = lazyPage(() =>
  import('./pages/CarrierDetail.js').then((m) => ({ default: m.CarrierDetail })),
)
const Carriers = lazyPage(() =>
  import('./pages/Carriers.js').then((m) => ({ default: m.Carriers })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const ShipmentDetail = lazyPage(() =>
  import('./pages/ShipmentDetail.js').then((m) => ({ default: m.ShipmentDetail })),
)
const Shipments = lazyPage(() =>
  import('./pages/Shipments.js').then((m) => ({ default: m.Shipments })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazyPage(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Webhooks = lazyPage(() =>
  import('./pages/Webhooks.js').then((m) => ({ default: m.Webhooks })),
)
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          awaitSession
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
                <Route element={<WaypointLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/shipments" element={<Shipments />} />
                  <Route path="/shipments/:id" element={<ShipmentDetail />} />
                  <Route path="/carriers" element={<Carriers />} />
                  <Route path="/carriers/:id" element={<CarrierDetail />} />
                  <Route path="/alerts" element={<Alerts />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/webhooks" element={<Webhooks />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
