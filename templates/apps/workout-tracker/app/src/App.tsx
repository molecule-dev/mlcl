import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ForjaAppShell } from './components/ForjaAppShell.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { ActiveWorkout } from './pages/ActiveWorkout.js'
import { BodyMeasurements } from './pages/BodyMeasurements.js'
import { Dashboard } from './pages/Dashboard.js'
import { ExerciseDetail } from './pages/ExerciseDetail.js'
import { Exercises } from './pages/Exercises.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { History } from './pages/History.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { PersonalRecords } from './pages/PersonalRecords.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TemplateEditor } from './pages/TemplateEditor.js'
import { Templates } from './pages/Templates.js'
import { Terms } from './pages/Terms.js'
import { WorkoutDetail } from './pages/WorkoutDetail.js'

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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
