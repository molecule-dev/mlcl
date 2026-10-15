import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EmployeeOnboardingLayout } from './components/EmployeeOnboardingLayout.js'
import { About } from './pages/About.js'
import { Checklist } from './pages/Checklist.js'
import { Dashboard } from './pages/Dashboard.js'
import { Documents } from './pages/Documents.js'
import { DocumentViewer } from './pages/DocumentViewer.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TaskDetail } from './pages/TaskDetail.js'
import { TeamDirectory } from './pages/TeamDirectory.js'
import { TeamMemberProfile } from './pages/TeamMemberProfile.js'
import { Terms } from './pages/Terms.js'
import { Timeline } from './pages/Timeline.js'
import { Training } from './pages/Training.js'
import { TrainingModule } from './pages/TrainingModule.js'
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
        <AnalyticsRouteListener />
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* Authed */}
          <Route element={<AuthGuard />}>
            <Route element={<EmployeeOnboardingLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/checklist" element={<Checklist />} />
              <Route path="/checklist/:id" element={<TaskDetail />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/:id" element={<DocumentViewer />} />
              <Route path="/team" element={<TeamDirectory />} />
              <Route path="/team/:id" element={<TeamMemberProfile />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/training" element={<Training />} />
              <Route path="/training/:id" element={<TrainingModule />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* Renders its own Header/Footer chrome, so it lives outside the sidebar layout */}
            <Route path="/plan-updated" element={<PlanUpdated />} />
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
