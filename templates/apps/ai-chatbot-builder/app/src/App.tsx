import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const BotAnalyticsPage = lazy(() =>
  import('./pages/BotAnalytics.js').then((m) => ({ default: m.BotAnalyticsPage })),
)
const BotDeployPage = lazy(() =>
  import('./pages/BotDeploy.js').then((m) => ({ default: m.BotDeployPage })),
)
const BotEditorPage = lazy(() =>
  import('./pages/BotEditor.js').then((m) => ({ default: m.BotEditorPage })),
)
const BotSettingsPage = lazy(() =>
  import('./pages/BotSettings.js').then((m) => ({ default: m.BotSettingsPage })),
)
const BotsListPage = lazy(() =>
  import('./pages/BotsList.js').then((m) => ({ default: m.BotsListPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const IntegrationsPage = lazy(() =>
  import('./pages/Integrations.js').then((m) => ({ default: m.IntegrationsPage })),
)
const KnowledgeBasePage = lazy(() =>
  import('./pages/KnowledgeBase.js').then((m) => ({ default: m.KnowledgeBasePage })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TestChatPage = lazy(() =>
  import('./pages/TestChat.js').then((m) => ({ default: m.TestChatPage })),
)
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
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
