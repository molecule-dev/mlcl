import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import AppShell from './components/AppShell.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Annotations = lazyPage(() =>
  import('./pages/Annotations.js').then((m) => ({ default: m.Annotations })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Embed = lazyPage(() => import('./pages/Embed.js').then((m) => ({ default: m.Embed })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const ModelEdit = lazyPage(() =>
  import('./pages/ModelEdit.js').then((m) => ({ default: m.ModelEdit })),
)
const ModelLibrary = lazyPage(() =>
  import('./pages/ModelLibrary.js').then((m) => ({ default: m.ModelLibrary })),
)
const ModelViewer = lazyPage(() =>
  import('./pages/ModelViewer.js').then((m) => ({ default: m.ModelViewer })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Upload = lazyPage(() => import('./pages/Upload.js').then((m) => ({ default: m.Upload })))
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                {/*
                  Shell pages — one `<ResponsiveAppShell>` layout route wraps
                  them all, so pages stop mounting nav chrome individually.
                */}
                <Route element={<AppShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/models" element={<ModelLibrary />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/models/:id/embed" element={<Embed />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/models/:id/edit" element={<ModelEdit />} />
                  <Route path="/notifications" element={<Notifications />} />
                </Route>
                {/*
                  Canvas surfaces — full-viewport viewers that carry their own
                  HUD chrome, not the shell (their bars are page content).
                */}
                <Route path="/models/:id" element={<ModelViewer />} />
                <Route path="/models/:id/annotations" element={<Annotations />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<About />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
