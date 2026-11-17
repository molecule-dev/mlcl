import type { ReactNode } from 'react'
import { useRoutes } from 'react-router'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import type { AppRoute } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'

// Pages are imported STATICALLY, and that is a measured decision, not an
// oversight. Route-level splitting was tried here and made this scaffold
// slower: every page is small (the whole page set is ~165 KB of source, about
// 45 KB gzip), while a `lazy()` page costs a serial chunk request after the
// entry executes, and — when that chunk resolves after React has already
// committed the Suspense fallback — React then holds the commit until
// `globalMostRecentFallbackTime + 300 ms` (SUSPENSE_FALLBACK_THROTTLE in
// react-dom). Measured with 150 ms added latency per request: 10-sample cold
// TTI 402 → 688 ms, warm navigation 372 → 512 ms, 5 → 18 requests. A full
// document load can land on ANY route here (a deep link, or a session restored
// from storage by `authClient.initialize()`), so no page can be moved off the
// first-paint path safely. Keep new routes static too. The weight that does
// leave the entry — 79 companion locale dictionaries, the analytics SDK, the
// service worker's precache — is the part with a measured gain; see the
// `UserMenu` drawer for the one interaction-only split that is still worth it.
//
// main.tsx owns AppLayout and RouteAccess inside AppRoot's providers, so replacing
// page routes or this provider wrapper cannot silently remove those boundaries. The routes
// below declare both the page and its access: App and main.tsx use the SAME table.
// Keep the exported table; the entry imports it. Add a public page once, with
// access: 'public'; there is no second path allowlist to update.
// AppRoot's `awaitSession` waits only while auth status is 'loading'. A stored
// token AND cached user restore synchronously without a request; token-only and
// cookie-only sessions need an asynchronous current-user request. Public pages
// then read the restored user when restoration succeeds. An 'unavailable' session
// still renders and may have a null user; handle that status separately from sign-out.
// A visitor with no session to restore makes no request. Keep it.
/**
 * Entry-point providers. main.tsx mounts the access boundary inside these providers.
 * @param props - The application's page routes.
 * @returns The router and bonded providers around the access boundary.
 */
export function AppRoot({ children }: { children: ReactNode }): ReactNode {
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
        {children}
      </MoleculeProvider>
    </BrowserRouter>
  )
}

/**
 * Pages render inside the shared app shell, independently of access policy.
 * A page that deliberately owns its entire layout opts out with `layout: 'none'`.
 * The opt-out includes that route's descendants; it never changes their access.
 */
export const routes: AppRoute[] = [
  { path: '/login', access: 'public', element: <Login /> },
  { path: '/signup', access: 'public', element: <Signup /> },
  { path: '/about', access: 'public', element: <About /> },
  { path: '/forgot-password', access: 'public', element: <ForgotPassword /> },
  { path: '/reset-password', access: 'public', element: <ResetPassword /> },
  {
    access: 'private',
    children: [
      { path: '/', access: 'private', element: <Home /> },
      { path: '/settings', access: 'private', element: <Settings /> },
      { path: '/plan-updated', access: 'private', element: <PlanUpdated /> },
    ],
  },
]

export function App() {
  return useRoutes(routes)
}
