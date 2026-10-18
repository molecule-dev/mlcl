import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FugueLayout } from './components/FugueLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Editor = lazy(() => import('./pages/Editor.js').then((m) => ({ default: m.Editor })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Mixing = lazy(() => import('./pages/Mixing.js').then((m) => ({ default: m.Mixing })))
const PianoRoll = lazy(() => import('./pages/PianoRoll.js').then((m) => ({ default: m.PianoRoll })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Projects = lazy(() => import('./pages/Projects.js').then((m) => ({ default: m.Projects })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SampleDetail = lazy(() =>
  import('./pages/SampleDetail.js').then((m) => ({ default: m.SampleDetail })),
)
const Samples = lazy(() => import('./pages/Samples.js').then((m) => ({ default: m.Samples })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                <Route element={<FugueLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<Editor />} />
                  <Route path="/projects/:id/mix" element={<Mixing />} />
                  <Route path="/projects/:id/clips/:clipId" element={<PianoRoll />} />
                  <Route path="/samples" element={<Samples />} />
                  <Route path="/samples/:id" element={<SampleDetail />} />
                  <Route path="/profile/:handle" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/billing" element={<Billing />} />
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
