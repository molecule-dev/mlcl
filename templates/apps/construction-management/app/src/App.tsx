import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { GroundworkLayout } from './components/GroundworkLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const DailyLogs = lazy(() => import('./pages/DailyLogs.js').then((m) => ({ default: m.DailyLogs })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProjectDetail = lazy(() =>
  import('./pages/ProjectDetail.js').then((m) => ({ default: m.ProjectDetail })),
)
const Projects = lazy(() => import('./pages/Projects.js').then((m) => ({ default: m.Projects })))
const PunchList = lazy(() => import('./pages/PunchList.js').then((m) => ({ default: m.PunchList })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RfiDetail = lazy(() => import('./pages/RfiDetail.js').then((m) => ({ default: m.RfiDetail })))
const Rfis = lazy(() => import('./pages/Rfis.js').then((m) => ({ default: m.Rfis })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Subcontractors = lazy(() =>
  import('./pages/Subcontractors.js').then((m) => ({ default: m.Subcontractors })),
)
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
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />

              {/* Authenticated workspace */}
              <Route element={<AuthGuard />}>
                <Route element={<GroundworkLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:projectId" element={<ProjectDetail />} />
                  <Route path="/projects/:projectId/logs" element={<DailyLogs />} />
                  <Route path="/projects/:projectId/punch" element={<PunchList />} />
                  <Route path="/projects/:projectId/rfis" element={<Rfis />} />
                  <Route path="/projects/:projectId/rfis/:rfiId" element={<RfiDetail />} />
                  <Route path="/projects/:projectId/subs" element={<Subcontractors />} />
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
