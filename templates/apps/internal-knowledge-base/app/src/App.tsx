import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CairnLayout } from './components/CairnLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { ArticleEditor } from './pages/ArticleEditor.js'
import { ArticleView } from './pages/ArticleView.js'
import { Bookmarks } from './pages/Bookmarks.js'
import { Drafts } from './pages/Drafts.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewSpace } from './pages/NewSpace.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SearchResults } from './pages/SearchResults.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SpaceHome } from './pages/SpaceHome.js'
import { SpacesIndex } from './pages/SpacesIndex.js'
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
        <RootErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* /plan-updated is the post-checkout confirmation Stripe redirects */}
            {/* back to. It must be public-readable: Stripe sometimes drops the */}
            {/* user back without an active session, and the page should still */}
            {/* render its confirmation copy. */}
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route element={<AuthGuard />}>
              <Route element={<CairnLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/spaces" element={<SpacesIndex />} />
                <Route path="/spaces/new" element={<NewSpace />} />
                <Route path="/spaces/:key" element={<SpaceHome />} />
                <Route path="/article/:id" element={<ArticleView />} />
                <Route path="/article/:id/edit" element={<ArticleEditor />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
