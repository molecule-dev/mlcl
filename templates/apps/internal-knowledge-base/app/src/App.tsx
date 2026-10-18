import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CairnLayout } from './components/CairnLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ArticleEditor = lazy(() =>
  import('./pages/ArticleEditor.js').then((m) => ({ default: m.ArticleEditor })),
)
const ArticleView = lazy(() =>
  import('./pages/ArticleView.js').then((m) => ({ default: m.ArticleView })),
)
const Bookmarks = lazy(() => import('./pages/Bookmarks.js').then((m) => ({ default: m.Bookmarks })))
const Drafts = lazy(() => import('./pages/Drafts.js').then((m) => ({ default: m.Drafts })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewSpace = lazy(() => import('./pages/NewSpace.js').then((m) => ({ default: m.NewSpace })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SearchResults = lazy(() =>
  import('./pages/SearchResults.js').then((m) => ({ default: m.SearchResults })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SpaceHome = lazy(() => import('./pages/SpaceHome.js').then((m) => ({ default: m.SpaceHome })))
const SpacesIndex = lazy(() =>
  import('./pages/SpacesIndex.js').then((m) => ({ default: m.SpacesIndex })),
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
