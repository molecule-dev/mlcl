import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Automations } from './pages/Automations.js'
import { Billing } from './pages/Billing.js'
import { Charts } from './pages/Charts.js'
import { Editor } from './pages/Editor.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { History } from './pages/History.js'
import { Integrations } from './pages/Integrations.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { TemplatePreview } from './pages/TemplatePreview.js'
import { Templates } from './pages/Templates.js'
import { Terms } from './pages/Terms.js'
import { Workbooks } from './pages/Workbooks.js'

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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
