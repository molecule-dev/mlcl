import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ForumLayout } from './components/ForumLayout.js'
import { About } from './pages/About.js'
import { Categories } from './pages/Categories.js'
import { CategoryDetail } from './pages/CategoryDetail.js'
import { Compose } from './pages/Compose.js'
import { Feed } from './pages/Feed.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { ModQueue } from './pages/ModQueue.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { ThreadView } from './pages/ThreadView.js'
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
              ForumLayout: Stripe can drop the user back without an active
              session, and nesting it inside the sidebar shell double-wraps
              the page with a second header/footer. */}
          <Route path="/plan-updated" element={<PlanUpdated />} />
          <Route element={<AuthGuard />}>
            <Route element={<ForumLayout />}>
              <Route path="/feed" element={<Feed />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/c/:slug" element={<CategoryDetail />} />
              <Route path="/thread/:id" element={<ThreadView />} />
              <Route path="/compose" element={<Compose />} />
              <Route path="/u/:username" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/search" element={<Search />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/mod" element={<ModQueue />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
