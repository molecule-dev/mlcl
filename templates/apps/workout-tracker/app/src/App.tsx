import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ForjaAppShell } from './components/ForjaAppShell.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ActiveWorkout = lazyPage(() =>
  import('./pages/ActiveWorkout.js').then((m) => ({ default: m.ActiveWorkout })),
)
const BodyMeasurements = lazyPage(() =>
  import('./pages/BodyMeasurements.js').then((m) => ({ default: m.BodyMeasurements })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ExerciseDetail = lazyPage(() =>
  import('./pages/ExerciseDetail.js').then((m) => ({ default: m.ExerciseDetail })),
)
const Exercises = lazyPage(() =>
  import('./pages/Exercises.js').then((m) => ({ default: m.Exercises })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const History = lazyPage(() => import('./pages/History.js').then((m) => ({ default: m.History })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const PersonalRecords = lazyPage(() =>
  import('./pages/PersonalRecords.js').then((m) => ({ default: m.PersonalRecords })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TemplateEditor = lazyPage(() =>
  import('./pages/TemplateEditor.js').then((m) => ({ default: m.TemplateEditor })),
)
const Templates = lazyPage(() =>
  import('./pages/Templates.js').then((m) => ({ default: m.Templates })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WorkoutDetail = lazyPage(() =>
  import('./pages/WorkoutDetail.js').then((m) => ({ default: m.WorkoutDetail })),
)

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
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route element={<AuthGuard />}>
                <Route element={<ForjaAppShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/workout/active" element={<ActiveWorkout />} />
                  <Route path="/exercises" element={<Exercises />} />
                  <Route path="/exercises/:id" element={<ExerciseDetail />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/history/:id" element={<WorkoutDetail />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/:id/edit" element={<TemplateEditor />} />
                  <Route path="/measurements" element={<BodyMeasurements />} />
                  <Route path="/records" element={<PersonalRecords />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
