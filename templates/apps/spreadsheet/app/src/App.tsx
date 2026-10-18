import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Automations = lazy(() =>
  import('./pages/Automations.js').then((m) => ({ default: m.Automations })),
)
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Charts = lazy(() => import('./pages/Charts.js').then((m) => ({ default: m.Charts })))
const Editor = lazy(() => import('./pages/Editor.js').then((m) => ({ default: m.Editor })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const History = lazy(() => import('./pages/History.js').then((m) => ({ default: m.History })))
const Integrations = lazy(() =>
  import('./pages/Integrations.js').then((m) => ({ default: m.Integrations })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazy(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const TemplatePreview = lazy(() =>
  import('./pages/TemplatePreview.js').then((m) => ({ default: m.TemplatePreview })),
)
const Templates = lazy(() => import('./pages/Templates.js').then((m) => ({ default: m.Templates })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Workbooks = lazy(() => import('./pages/Workbooks.js').then((m) => ({ default: m.Workbooks })))

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
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
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Authenticated workbench routes */}
              <Route element={<AuthGuard />}>
                <Route path="/workbooks" element={<Workbooks />} />
                <Route path="/workbooks/:id" element={<Editor />} />
                <Route path="/workbooks/:id/charts" element={<Charts />} />
                <Route path="/workbooks/:id/history" element={<History />} />
                <Route path="/templates" element={<Templates />} />
                <Route path="/templates/:id" element={<TemplatePreview />} />
                <Route path="/automations" element={<Automations />} />
                <Route path="/integrations" element={<Integrations />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/team" element={<Team />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<Billing />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
