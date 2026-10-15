import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { ChannelPage } from './pages/Channel.js'
import { DashboardPage } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { ThreadPage } from './pages/Thread.js'
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
