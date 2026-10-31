import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PylonShell } from './components/PylonShell.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const APIKeys = lazyPage(() => import('./pages/APIKeys.js').then((m) => ({ default: m.APIKeys })))
const AuditLog = lazyPage(() =>
  import('./pages/AuditLog.js').then((m) => ({ default: m.AuditLog })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Deliveries = lazyPage(() =>
  import('./pages/Deliveries.js').then((m) => ({ default: m.Deliveries })),
)
const DeliveryDetail = lazyPage(() =>
  import('./pages/DeliveryDetail.js').then((m) => ({ default: m.DeliveryDetail })),
)
const EndpointDetail = lazyPage(() =>
  import('./pages/EndpointDetail.js').then((m) => ({ default: m.EndpointDetail })),
)
const Endpoints = lazyPage(() =>
  import('./pages/Endpoints.js').then((m) => ({ default: m.Endpoints })),
)
const EventDetail = lazyPage(() =>
  import('./pages/EventDetail.js').then((m) => ({ default: m.EventDetail })),
)
const Events = lazyPage(() => import('./pages/Events.js').then((m) => ({ default: m.Events })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewEndpoint = lazyPage(() =>
  import('./pages/NewEndpoint.js').then((m) => ({ default: m.NewEndpoint })),
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
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazyPage(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
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
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
