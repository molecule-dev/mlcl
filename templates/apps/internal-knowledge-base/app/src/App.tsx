import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CairnLayout } from './components/CairnLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ArticleEditor = lazyPage(() =>
  import('./pages/ArticleEditor.js').then((m) => ({ default: m.ArticleEditor })),
)
const ArticleView = lazyPage(() =>
  import('./pages/ArticleView.js').then((m) => ({ default: m.ArticleView })),
)
const Bookmarks = lazyPage(() =>
  import('./pages/Bookmarks.js').then((m) => ({ default: m.Bookmarks })),
)
const Drafts = lazyPage(() => import('./pages/Drafts.js').then((m) => ({ default: m.Drafts })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewSpace = lazyPage(() =>
  import('./pages/NewSpace.js').then((m) => ({ default: m.NewSpace })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SearchResults = lazyPage(() =>
  import('./pages/SearchResults.js').then((m) => ({ default: m.SearchResults })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SpaceHome = lazyPage(() =>
  import('./pages/SpaceHome.js').then((m) => ({ default: m.SpaceHome })),
)
const SpacesIndex = lazyPage(() =>
  import('./pages/SpacesIndex.js').then((m) => ({ default: m.SpacesIndex })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
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
