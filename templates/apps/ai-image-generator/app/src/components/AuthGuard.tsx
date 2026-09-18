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
