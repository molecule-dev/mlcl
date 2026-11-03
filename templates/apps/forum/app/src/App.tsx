import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ForumLayout } from './components/ForumLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Categories = lazyPage(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const CategoryDetail = lazyPage(() =>
  import('./pages/CategoryDetail.js').then((m) => ({ default: m.CategoryDetail })),
)
const Compose = lazyPage(() => import('./pages/Compose.js').then((m) => ({ default: m.Compose })))
const Feed = lazyPage(() => import('./pages/Feed.js').then((m) => ({ default: m.Feed })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const ModQueue = lazyPage(() =>
  import('./pages/ModQueue.js').then((m) => ({ default: m.ModQueue })),
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
const Search = lazyPage(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThreadView = lazyPage(() =>
  import('./pages/ThreadView.js').then((m) => ({ default: m.ThreadView })),
)
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
