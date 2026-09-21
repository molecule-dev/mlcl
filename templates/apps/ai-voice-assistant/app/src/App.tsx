import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ParlanceLayout } from './components/ParlanceLayout.js'
import { About } from './pages/About.js'
import { AgentDetail } from './pages/AgentDetail.js'
import { Agents } from './pages/Agents.js'
import { Billing } from './pages/Billing.js'
import { Conversation } from './pages/Conversation.js'
import { ConversationDetail } from './pages/ConversationDetail.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { History } from './pages/History.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
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
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route element={<AuthGuard />}>
              <Route element={<ParlanceLayout />}>
                <Route path="/conversation" element={<Conversation />} />
                <Route path="/history" element={<History />} />
                <Route path="/history/:id" element={<ConversationDetail />} />
                <Route path="/agents" element={<Agents />} />
                <Route path="/agents/:id" element={<AgentDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/settings/billing" element={<Billing />} />
                <Route path="/search" element={<Search />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
