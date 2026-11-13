/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated` redirect mistakes for signed out.
 *
 * Route: `<Route element={<AuthGuard />}>...</Route>`; in-page section:
 * `<AuthGuard><SignedInSection /></AuthGuard>`.
 * For a custom in-page check, hold only while `status === 'loading'`, redirect
 * only on `status === 'unauthenticated'`, and let `'unavailable'` render without
 * treating it as confirmed sign-in. Keep public sections outside the guard for signed-out visitors.
 * The application shell passes `awaitSession` to `MoleculeProvider`, so a public page's
 * signed-in action (Follow, Favorite) reads the restored user when restoration
 * succeeds. An unavailable session may still have a null user; handle that status
 * separately from sign-out. Keep that prop.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */
import { useHttpClient } from '@molecule/app-react'
import { AuthGuard as SharedAuthGuard } from '@molecule/app-ui-react'

/**
 * Per-app AuthGuard wrapper for ai-image-generator.
 *
 * Composes the shared @molecule/app-ui-react AuthGuard and adds a
 * one-shot POST to /api/bootstrap whenever the user becomes
 * authenticated, so demo data is seeded before the dashboard loads.
 * The server short-circuits if seed rows already exist, so firing
 * onAuthenticated on every false→true transition is safe.
 */
export function AuthGuard() {
  const http = useHttpClient()
  return (
    <SharedAuthGuard
      onAuthenticated={() => {
        http.post('/api/bootstrap', {}).catch(() => {})
      }}
    />
  )
}
