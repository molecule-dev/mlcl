import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ConduitLayout } from './components/ConduitLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Artifacts = lazy(() => import('./pages/Artifacts.js').then((m) => ({ default: m.Artifacts })))
const Environments = lazy(() =>
  import('./pages/Environments.js').then((m) => ({ default: m.Environments })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Insights = lazy(() => import('./pages/Insights.js').then((m) => ({ default: m.Insights })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PipelineDetail = lazy(() =>
  import('./pages/PipelineDetail.js').then((m) => ({ default: m.PipelineDetail })),
)
const Pipelines = lazy(() => import('./pages/Pipelines.js').then((m) => ({ default: m.Pipelines })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Repositories = lazy(() =>
  import('./pages/Repositories.js').then((m) => ({ default: m.Repositories })),
)
const RepositoryDetail = lazy(() =>
  import('./pages/RepositoryDetail.js').then((m) => ({ default: m.RepositoryDetail })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />

              {/* Authenticated routes (sidebar layout) */}
              <Route element={<AuthGuard />}>
                <Route element={<ConduitLayout />}>
                  <Route path="/pipelines" element={<Pipelines />} />
                  <Route path="/pipelines/:id" element={<PipelineDetail />} />
                  <Route path="/repositories" element={<Repositories />} />
                  <Route path="/repositories/:slug" element={<RepositoryDetail />} />
                  <Route path="/environments" element={<Environments />} />
                  <Route path="/artifacts" element={<Artifacts />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
