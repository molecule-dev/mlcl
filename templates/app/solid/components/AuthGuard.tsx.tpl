import { Navigate, useLocation } from '@solidjs/router'
import { type ParentProps, Show } from 'solid-js'

import { createAuth, useTranslate } from '@molecule/app-solid'

/**
 * The pathname part of a login path (`/login?next=x` → `/login`).
 */
const loginPathname = (loginPath: string): string => loginPath.split(/[?#]/)[0] || '/'

/**
 * Route-element guard for authenticated sections of the app.
 *
 * - While `state().status` is `'loading'` (no session decision yet), renders the
 *   default loading tag (`data-mol-id="auth-guard-loading"`).
 * - If the status is `'unauthenticated'`, redirects to `/login` carrying
 *   the attempted location in `state.from` for post-login restoration. On
 *   `/login` itself it renders its children instead, so a guard that wraps
 *   the whole route tree does not redirect in a loop.
 * - Otherwise renders `children`.
 *
 * The guard reads `status`, not `initialized`: a stored token AND user make the
 * FIRST render `'authenticated'`, so a protected page paints immediately instead
 * of waiting for the background verification. `'unavailable'` (a retained
 * candidate the server could not confirm) still renders the page and lets the
 * API decide. It is not a confirmed-session boolean: `isAuthenticated` can be
 * false and `user` null while a token/cookie-only candidate is unavailable, so
 * never redirect on the boolean.
 */
export function AuthGuard(props: ParentProps) {
  const t = useTranslate()
  const { state } = createAuth()
  const location = useLocation()
  const loginPath = '/login'

  return (
    <Show
      when={state().status !== 'loading'}
      fallback={
        <div data-mol-id="auth-guard-loading">
          {t('common.loading', undefined, { defaultValue: 'Loading...' })}
        </div>
      }
    >
      <Show
        when={
          state().status !== 'unauthenticated' || location.pathname === loginPathname(loginPath)
        }
        fallback={
          <Navigate
            href={loginPath}
            // A plain snapshot (the reactive `location` is a proxy, which
            // history state cannot carry) — the login page restores
            // `state.from.pathname` after a successful sign-in.
            state={{ from: { pathname: location.pathname, search: location.search } }}
          />
        }
      >
        {props.children}
      </Show>
    </Show>
  )
}
