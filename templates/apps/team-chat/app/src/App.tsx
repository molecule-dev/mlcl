import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ChannelPage = lazy(() =>
  import('./pages/Channel.js').then((m) => ({ default: m.ChannelPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
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
const ThreadPage = lazy(() => import('./pages/Thread.js').then((m) => ({ default: m.ThreadPage })))
export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              {/* Auth routes — outside chat layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/*
               * Bare placeholder routes: dashboard quick-actions / FAB / "New
               * Message" sidebar button used to push the user at /channels/new
               * (etc.) which then redirected to /channels/general — a channel
               * that doesn't exist for a brand-new user, dead-ending on a
               * "Channel not found" page. Send them to / instead so the
               * dashboard can show its "Create Channel" inline form. The
               * redirect-routes spec only asserts the URL changes away from
               * the original path, not its destination.
               */}
              <Route path="/channels" element={<Navigate to="/" replace />} />
              <Route
                path="/channels/new"
                element={<Navigate to="/?action=create-channel" replace />}
              />
              <Route
                path="/new-message"
                element={<Navigate to="/?action=create-channel" replace />}
              />
              <Route path="/compose" element={<Navigate to="/?action=create-channel" replace />} />
              <Route path="/dm/new" element={<Navigate to="/" replace />} />
              <Route path="/invite" element={<Navigate to="/settings" replace />} />
              <Route path="/billing" element={<Navigate to="/settings" replace />} />

              {/* Authenticated chat routes */}
              <Route element={<AuthGuard />}>
                <Route index element={<DashboardPage />} />
                <Route path="/channels/:channelId" element={<ChannelPage />} />
                <Route path="/channels/:channelId/threads/:messageId" element={<ThreadPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>

              {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Public about page */}
              <Route path="/about" element={<About />} />

              {/* Fallback */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
