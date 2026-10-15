import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { BotAnalyticsPage } from './pages/BotAnalytics.js'
import { BotDeployPage } from './pages/BotDeploy.js'
import { BotEditorPage } from './pages/BotEditor.js'
import { BotSettingsPage } from './pages/BotSettings.js'
import { BotsListPage } from './pages/BotsList.js'
import { DashboardPage } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { IntegrationsPage } from './pages/Integrations.js'
import { KnowledgeBasePage } from './pages/KnowledgeBase.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TestChatPage } from './pages/TestChat.js'
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
        <RootErrorBoundary>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* All builder routes behind AuthGuard. Each page renders its own
                chrome (sidebar/topnav) from the stitch baseline; layout
                components are extracted in Phase 2 if/when they prove to be
                shared across screens. */}
            <Route element={<AuthGuard />}>
              <Route index element={<DashboardPage />} />
              <Route path="/bots" element={<BotsListPage />} />
              <Route path="/bots/new" element={<BotEditorPage />} />
              <Route path="/bots/:id/editor" element={<BotEditorPage />} />
              <Route path="/bots/:id/analytics" element={<BotAnalyticsPage />} />
              <Route path="/bots/:id/settings" element={<BotSettingsPage />} />
              <Route path="/bots/:id/deploy" element={<BotDeployPage />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
              <Route path="/test-chat" element={<TestChatPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Fallback */}
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
