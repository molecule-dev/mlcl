import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Compose } from './pages/Compose.js'
import { Drafts } from './pages/Drafts.js'
import { Archive, Sent, Spam, Trash } from './pages/FolderView.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { Inbox } from './pages/Inbox.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Starred } from './pages/Starred.js'
import { Terms } from './pages/Terms.js'
import { ThreadView } from './pages/ThreadView.js'
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
            <Route element={<AuthGuard />}>
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/thread/:id" element={<ThreadView />} />
              <Route path="/drafts" element={<Drafts />} />
              <Route path="/starred" element={<Starred />} />
              <Route path="/sent" element={<Sent />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/spam" element={<Spam />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
