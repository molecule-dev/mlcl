import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ChannelPage = lazyPage(() =>
  import('./pages/Channel.js').then((m) => ({ default: m.ChannelPage })),
)
const DashboardPage = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThreadPage = lazyPage(() =>
  import('./pages/Thread.js').then((m) => ({ default: m.ThreadPage })),
)
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
