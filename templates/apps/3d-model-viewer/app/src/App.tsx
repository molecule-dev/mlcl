import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Annotations } from './pages/Annotations.js'
import { Dashboard } from './pages/Dashboard.js'
import { Embed } from './pages/Embed.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { ModelEdit } from './pages/ModelEdit.js'
import { ModelLibrary } from './pages/ModelLibrary.js'
import { ModelViewer } from './pages/ModelViewer.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Upload } from './pages/Upload.js'
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
            <Route element={<AuthGuard />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/models" element={<ModelLibrary />} />
              <Route path="/models/:id" element={<ModelViewer />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/models/:id/embed" element={<Embed />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/models/:id/annotations" element={<Annotations />} />
              <Route path="/models/:id/edit" element={<ModelEdit />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
