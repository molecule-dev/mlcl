import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Assets } from './pages/Assets.js'
import { Dashboard } from './pages/Dashboard.js'
import { Editor } from './pages/Editor.js'
import { Export } from './pages/Export.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Library } from './pages/Library.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Projects } from './pages/Projects.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { SharePreview } from './pages/SharePreview.js'
import { Signup } from './pages/Signup.js'
import { StateMachine } from './pages/StateMachine.js'
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
            <Route path="/share/:token" element={<SharePreview />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route element={<AuthGuard />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<Editor />} />
              <Route path="/projects/:id/export" element={<Export />} />
              <Route path="/projects/:id/states" element={<StateMachine />} />
              <Route path="/library" element={<Library />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
