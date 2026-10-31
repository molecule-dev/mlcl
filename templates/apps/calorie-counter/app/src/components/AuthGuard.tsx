/**
 * Keep the shared guard: it holds the restore window that a hand-written
 * `!isAuthenticated` redirect mistakes for signed out.
 *
 * Route: `<Route element={<AuthGuard />}>...</Route>`; in-page section:
 * `<AuthGuard><SignedInSection /></AuthGuard>`.
 * For a custom in-page check, hold only while `status === 'loading'`, redirect
 * only on `status === 'unauthenticated'`, and treat `'unavailable'` as signed
 * in. Keep public sections outside the guard so they render without waiting.
 * Prefer router navigation to full-page loads so clicks do not restart restore.
 */
export { AuthGuard } from '@molecule/app-ui-react'
