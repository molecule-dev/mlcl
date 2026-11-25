import type { ReactNode } from 'react'
import { useRoutes } from 'react-router'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import type { AppRoute } from './components/AuthGuard.js'
{{#feature footer}}
import { About } from './pages/About.js'
{{/feature}}
{{#feature emails}}
import { ForgotPassword } from './pages/ForgotPassword.js'
import { ResetPassword } from './pages/ResetPassword.js'
{{/feature}}
import { Home } from './pages/Home.js'
import { Login } from './pages/Login.js'
{{#feature payments}}
import { PlanUpdated } from './pages/PlanUpdated.js'
{{/feature}}
{{#feature settings}}
import { Settings } from './pages/Settings.js'
{{/feature}}
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
// bootstrap.tsx mounts the browser router outside AppRoot and AppLayout and RouteAccess
// inside AppRoot's providers. Keep this file focused on providers and page routes.
// The routes below declare both the page and its access: App and bootstrap.tsx use the same table.
// Keep the exported table; the entry imports it. Add a public page once, with
// access: 'public'; there is no second path allowlist to update.
// AppRoot's `awaitSession` waits only while auth status is 'loading'. A stored
// token AND cached user restore synchronously without a request; token-only and
// cookie-only sessions need an asynchronous current-user request. Public pages
// then read the restored user when restoration succeeds. An 'unavailable' session
// still renders and may have a null user; handle that status separately from sign-out.
// A visitor with no session to restore makes no request. Keep it.
/**
 * Bonded providers for the application. The entry point supplies the router and access boundary.
 * @param props - The application shell and pages.
 * @returns The children with the application's bonded providers.
 */
export function AppRoot({ children }: { children: ReactNode }): ReactNode {
  return (
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
  )
}

/**
 * Pages render inside the shared app shell, independently of access policy.
 * A page that deliberately owns its entire layout opts out with `layout: 'none'`.
 * The opt-out includes that route's descendants; it never changes their access.
 *
 * For URL filters loaded from the API, use one route declaration for each
 * choice's link and the list it loads. Mount the same view at /inventory
 * and /inventory/:category so the links stay visible while results load.
 *
 * @example
 * ```tsx
 * import type { ReactNode } from 'react'
 * import { ListRouteNav } from '@molecule/app-routing-react-router'
 *
 * export function InventoryFilters({
 *   categories,
 *   navigationLabel,
 *   renderResults,
 * }: {
 *   categories: readonly string[]
 *   navigationLabel: string
 *   renderResults: (category: string | undefined, page: number) => ReactNode
 * }) {
 *   const selections = Object.fromEntries(
 *     categories.map((category) => [
 *       category,
 *       { label: category, path: '/inventory/:category', params: { category } },
 *     ]),
 *   )
 *   return (
 *     <ListRouteNav aria-label={navigationLabel} selections={selections} list={{}}>
 *       {({ params, page }) => renderResults(params.category, page)}
 *     </ListRouteNav>
 *   )
 * }
 * ```
 */
export const routes: AppRoute[] = [
  { path: '/login', access: 'public', element: <Login /> },
  { path: '/signup', access: 'public', element: <Signup /> },
{{#feature footer}}
  { path: '/about', access: 'public', element: <About /> },
{{/feature}}
{{#feature emails}}
  { path: '/forgot-password', access: 'public', element: <ForgotPassword /> },
  { path: '/reset-password', access: 'public', element: <ResetPassword /> },
{{/feature}}
  {
    access: 'private',
{{#feature settings}}
    children: [
      { path: '/', access: 'private', element: <Home /> },
      { path: '/settings', access: 'private', element: <Settings /> },
{{#feature payments}}
      { path: '/plan-updated', access: 'private', element: <PlanUpdated /> },
{{/feature}}
    ],
{{/feature}}
{{^feature settings}}
{{#feature payments}}
    children: [
      { path: '/', access: 'private', element: <Home /> },
      { path: '/plan-updated', access: 'private', element: <PlanUpdated /> },
    ],
{{/feature}}
{{^feature payments}}
    children: [{ path: '/', access: 'private', element: <Home /> }],
{{/feature}}
{{/feature}}
  },
]

export function App() {
  return useRoutes(routes)
}
