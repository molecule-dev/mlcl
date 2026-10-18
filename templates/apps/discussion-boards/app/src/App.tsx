import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { DiscussionBoardsLayout } from './components/DiscussionBoardsLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Bookmarks = lazy(() => import('./pages/Bookmarks.js').then((m) => ({ default: m.Bookmarks })))
const CategoriesList = lazy(() =>
  import('./pages/CategoriesList.js').then((m) => ({ default: m.CategoriesList })),
)
const CategoryDetail = lazy(() =>
  import('./pages/CategoryDetail.js').then((m) => ({ default: m.CategoryDetail })),
)
const Compose = lazy(() => import('./pages/Compose.js').then((m) => ({ default: m.Compose })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const ModerationQueue = lazy(() =>
  import('./pages/ModerationQueue.js').then((m) => ({ default: m.ModerationQueue })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
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
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThreadView = lazy(() =>
  import('./pages/ThreadView.js').then((m) => ({ default: m.ThreadView })),
)
const UserProfile = lazy(() =>
  import('./pages/UserProfile.js').then((m) => ({ default: m.UserProfile })),
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
        <Suspense fallback={null}>
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
