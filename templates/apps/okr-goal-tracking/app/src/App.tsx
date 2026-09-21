import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DashboardLayout } from './components/DashboardLayout.js'
import { About } from './pages/About.js'
import { Billing } from './pages/Billing.js'
import { CheckIn } from './pages/CheckIn.js'
import { Dashboard } from './pages/Dashboard.js'
import { EditObjective } from './pages/EditObjective.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewObjective } from './pages/NewObjective.js'
import { Notifications } from './pages/Notifications.js'
import { ObjectiveDetail } from './pages/ObjectiveDetail.js'
import { Objectives } from './pages/Objectives.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { ReviewDetail } from './pages/ReviewDetail.js'
import { Reviews } from './pages/Reviews.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'

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
        <AnalyticsRouteListener />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<AuthGuard />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/objectives" element={<Objectives />} />
              <Route path="/objectives/new" element={<NewObjective />} />
              <Route path="/objectives/:id" element={<ObjectiveDetail />} />
              <Route path="/objectives/:id/edit" element={<EditObjective />} />
              <Route path="/check-in" element={<CheckIn />} />
              <Route path="/team" element={<Team />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/reviews/:id" element={<ReviewDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/settings/billing" element={<Billing />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
