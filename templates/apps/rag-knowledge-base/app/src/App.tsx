import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EngramLayout } from './components/EngramLayout.js'
import { About } from './pages/About.js'
import { Analytics } from './pages/Analytics.js'
import { Ask } from './pages/Ask.js'
import { Billing } from './pages/Billing.js'
import { DocumentDetail } from './pages/DocumentDetail.js'
import { Documents } from './pages/Documents.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { History } from './pages/History.js'
import { KnowledgeGraph } from './pages/KnowledgeGraph.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Members } from './pages/Members.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SourceDetail } from './pages/SourceDetail.js'
import { Sources } from './pages/Sources.js'
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
              <Route element={<EngramLayout />}>
                <Route path="/ask" element={<Ask />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:id" element={<DocumentDetail />} />
                <Route path="/sources" element={<Sources />} />
                <Route path="/sources/:id" element={<SourceDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/history" element={<History />} />
                <Route path="/graph" element={<KnowledgeGraph />} />
                <Route path="/members" element={<Members />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/billing" element={<Billing />} />
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
