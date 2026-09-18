import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RenditionLayout } from './components/RenditionLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Billing } from './pages/Billing.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Glossary } from './pages/Glossary.js'
import { Help } from './pages/Help.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Memory } from './pages/Memory.js'
import { NewProject } from './pages/NewProject.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ProjectDetail } from './pages/ProjectDetail.js'
import { Projects } from './pages/Projects.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Review } from './pages/Review.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'
import { Translate } from './pages/Translate.js'
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
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route element={<AuthGuard />}>
              <Route element={<RenditionLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/translate" element={<Translate />} />
                <Route path="/translate/:id" element={<Translate />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/new" element={<NewProject />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/glossary" element={<Glossary />} />
                <Route path="/memory" element={<Memory />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/review" element={<Review />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/team" element={<Team />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
