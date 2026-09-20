import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { FeedbackLayout } from './components/FeedbackLayout.js'
import { About } from './pages/About.js'
import { AdminDashboard } from './pages/AdminDashboard.js'
import { BoardDetail } from './pages/BoardDetail.js'
import { Boards } from './pages/Boards.js'
import { Changelog } from './pages/Changelog.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { MyActivity } from './pages/MyActivity.js'
import { NotFound } from './pages/NotFound.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { PostDetail } from './pages/PostDetail.js'
import { PostsAdmin } from './pages/PostsAdmin.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Roadmap } from './pages/Roadmap.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SubmitPost } from './pages/SubmitPost.js'
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
      </MoleculeProvider>
    </BrowserRouter>
  )
}
