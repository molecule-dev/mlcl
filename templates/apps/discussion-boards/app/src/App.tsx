import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DiscussionBoardsLayout } from './components/DiscussionBoardsLayout.js'
import { About } from './pages/About.js'
import { Bookmarks } from './pages/Bookmarks.js'
import { CategoriesList } from './pages/CategoriesList.js'
import { CategoryDetail } from './pages/CategoryDetail.js'
import { Compose } from './pages/Compose.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { ModerationQueue } from './pages/ModerationQueue.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { ThreadView } from './pages/ThreadView.js'
import { UserProfile } from './pages/UserProfile.js'

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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          {/* /plan-updated is the post-checkout confirmation Stripe redirects */}
          {/* back to. It is a self-contained static landing (its own Header + */}
          {/* Footer, no app shell) and must be public-readable: Stripe can drop */}
          {/* the user back without an active session, and the page should still */}
          {/* render its confirmation copy WITHOUT firing any /api/* XHR — so it */}
          {/* stays OUTSIDE AuthGuard/DiscussionBoardsLayout (the layout's */}
          {/* AppHeader → SettingsPanel → AccountSection fetches /users/me). */}
          <Route path="/plan-updated" element={<PlanUpdated />} />
          <Route element={<AuthGuard />}>
            <Route element={<DiscussionBoardsLayout />}>
              <Route path="/c" element={<CategoriesList />} />
              <Route path="/c/:slug" element={<CategoryDetail />} />
              <Route path="/t/:id" element={<ThreadView />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/u/:username" element={<UserProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/search" element={<Search />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/moderation" element={<ModerationQueue />} />
              <Route path="/home" element={<Navigate to="/c" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
