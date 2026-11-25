import { Route, Router, type RouteSectionProps } from '@solidjs/router'
import { getClient as getHttpClient } from '@molecule/app-http'
import { setRouter } from '@molecule/app-routing'
import { createSolidRouter } from '@molecule/app-routing-solid-router'
import { MoleculeProvider } from '@molecule/app-solid'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { RouteAccess } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
{{#feature footer}}
import { About } from './pages/About.js'
{{/feature}}
{{#feature emails}}
import { ForgotPassword } from './pages/ForgotPassword.js'
{{/feature}}
import { Home } from './pages/Home.js'
import { Login } from './pages/Login.js'
{{#feature payments}}
import { PlanUpdated } from './pages/PlanUpdated.js'
{{/feature}}
{{#feature emails}}
import { ResetPassword } from './pages/ResetPassword.js'
{{/feature}}
{{#feature settings}}
import { Settings } from './pages/Settings.js'
{{/feature}}
import { Signup } from './pages/Signup.js'

// Pages are imported STATICALLY, and that is a deliberate decision, not an
// oversight. Route-level splitting was considered here and rejected: every page
// is small (the whole page set is a few hundred KB of source), while a lazy
// page costs a serial chunk request after the entry executes, and — when that
// chunk resolves after the router has already committed its Suspense fallback —
// the commit waits on the network round trip it hoped to hide. A full document
// load can land on ANY route here (a deep link, or a session restored from
// storage by `authClient.initialize()`), so no page can be moved off the
// first-paint path safely. Keep new routes static too. The weight that does
// leave the entry — 79 companion locale dictionaries, the analytics SDK, the
// service worker's precache — is the part with a real gain; see the `UserMenu`
// drawer for the one interaction-only split that is still worth it.
//
// main.tsx imports App separately from AppRoot's providers, so replacing page
// routes cannot silently remove the mounted tree. The access policy lives in
// AuthGuard.tsx.
// The providers live in the router's `root`, inside <Router>, where
// `createSolidRouter()` can read Solid Router's location: `useRouter()` from
// @molecule/app-solid and every molecule package that calls `getRouter()`
// navigate through it (SPA navigation, the entry's state and key kept), as
// React's `BrowserRouter` does.
// `awaitSession` waits only while auth status is 'loading'. A stored token AND
// cached user restore synchronously without a request; token-only and cookie-only
// sessions need an asynchronous current-user request. Public pages then read the
// restored user when restoration succeeds. An 'unavailable' session still renders
// and may have a null user; handle that status separately from sign-out.
// A visitor with no session to restore makes no request. Keep it.
function Root(props: RouteSectionProps) {
  const router = createSolidRouter()
  setRouter(router)
  return (
    <MoleculeProvider
      config={{
        auth: authClient,
        awaitSession: true,
        i18n: i18nProvider,
        theme: themeProvider,
        http: getHttpClient(),
        storage: getStorageProvider(),
        router,
      }}
    >
      <RouteAccess>{props.children}</RouteAccess>
    </MoleculeProvider>
  )
}

export function App() {
  return (
    <Router root={Root}>
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
{{#feature footer}}
      <Route path="/about" component={About} />
{{/feature}}
{{#feature emails}}
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
{{/feature}}
      <Route path="/" component={AppLayout}>
        <Route path="/" component={Home} />
{{#feature settings}}
        <Route path="/settings" component={Settings} />
{{/feature}}
{{#feature payments}}
        <Route path="/plan-updated" component={PlanUpdated} />
{{/feature}}
      </Route>
    </Router>
  )
}
