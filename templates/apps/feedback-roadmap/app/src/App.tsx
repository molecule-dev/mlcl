import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FeedbackLayout } from './components/FeedbackLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AdminDashboard = lazy(() =>
  import('./pages/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard })),
)
const BoardDetail = lazy(() =>
  import('./pages/BoardDetail.js').then((m) => ({ default: m.BoardDetail })),
)
const Boards = lazy(() => import('./pages/Boards.js').then((m) => ({ default: m.Boards })))
const Changelog = lazy(() => import('./pages/Changelog.js').then((m) => ({ default: m.Changelog })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyActivity = lazy(() =>
  import('./pages/MyActivity.js').then((m) => ({ default: m.MyActivity })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PostDetail = lazy(() =>
  import('./pages/PostDetail.js').then((m) => ({ default: m.PostDetail })),
)
const PostsAdmin = lazy(() =>
  import('./pages/PostsAdmin.js').then((m) => ({ default: m.PostsAdmin })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Roadmap = lazy(() => import('./pages/Roadmap.js').then((m) => ({ default: m.Roadmap })))
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SubmitPost = lazy(() =>
  import('./pages/SubmitPost.js').then((m) => ({ default: m.SubmitPost })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
            {/* /plan-updated is the post-checkout confirmation Stripe redirects
                back to. It is a self-contained static landing (its own Header +
                Footer via ContentPageShell) and must stay OUTSIDE AuthGuard/
                FeedbackLayout: Stripe can drop the user back without an active
                session, and nesting it inside the app shell double-wraps
                the page with a second header/footer. */}
            <Route path="/plan-updated" element={<PlanUpdated />} />
            {/* Public feedback face: boards, posts, roadmap, changelog and
                search are all readable signed-out — that is the point of a
                feedback portal. */}
            <Route element={<FeedbackLayout />}>
              <Route path="/boards" element={<Boards />} />
              <Route path="/b/:slug" element={<BoardDetail />} />
              <Route path="/post/:id" element={<PostDetail />} />
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/search" element={<Search />} />
            </Route>
            <Route element={<AuthGuard />}>
              <Route element={<FeedbackLayout />}>
                <Route path="/submit" element={<SubmitPost />} />
                <Route path="/my-activity" element={<MyActivity />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/posts" element={<PostsAdmin />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
