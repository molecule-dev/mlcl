import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { StatusPageLayout } from './components/StatusPageLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AuditLog = lazy(() => import('./pages/AuditLog.js').then((m) => ({ default: m.AuditLog })))
const ComponentDetail = lazy(() =>
  import('./pages/ComponentDetail.js').then((m) => ({ default: m.ComponentDetail })),
)
const Components = lazy(() =>
  import('./pages/Components.js').then((m) => ({ default: m.Components })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const IncidentDetail = lazy(() =>
  import('./pages/IncidentDetail.js').then((m) => ({ default: m.IncidentDetail })),
)
const IncidentForm = lazy(() =>
  import('./pages/IncidentForm.js').then((m) => ({ default: m.IncidentForm })),
)
const IncidentList = lazy(() =>
  import('./pages/IncidentList.js').then((m) => ({ default: m.IncidentList })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MaintenanceDetail = lazy(() =>
  import('./pages/MaintenanceDetail.js').then((m) => ({ default: m.MaintenanceDetail })),
)
const MaintenanceList = lazy(() =>
  import('./pages/MaintenanceList.js').then((m) => ({ default: m.MaintenanceList })),
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
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const PublicStatusPage = lazy(() =>
  import('./pages/PublicStatus.js').then((m) => ({ default: m.PublicStatusPage })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Subscribers = lazy(() =>
  import('./pages/Subscribers.js').then((m) => ({ default: m.Subscribers })),
)
const Team = lazy(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
