import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ConduitLayout } from './components/ConduitLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Artifacts = lazyPage(() =>
  import('./pages/Artifacts.js').then((m) => ({ default: m.Artifacts })),
)
const Environments = lazyPage(() =>
  import('./pages/Environments.js').then((m) => ({ default: m.Environments })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Insights = lazyPage(() =>
  import('./pages/Insights.js').then((m) => ({ default: m.Insights })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PipelineDetail = lazyPage(() =>
  import('./pages/PipelineDetail.js').then((m) => ({ default: m.PipelineDetail })),
)
const Pipelines = lazyPage(() =>
  import('./pages/Pipelines.js').then((m) => ({ default: m.Pipelines })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Repositories = lazyPage(() =>
  import('./pages/Repositories.js').then((m) => ({ default: m.Repositories })),
)
const RepositoryDetail = lazyPage(() =>
  import('./pages/RepositoryDetail.js').then((m) => ({ default: m.RepositoryDetail })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
