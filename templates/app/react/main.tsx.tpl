import { setupProviders, authClient } from './bonds/index.js'
import './index.css'
import './theme.css'

/** Set up providers and any app-specific startup before bootstrap.tsx mounts the router. */
export function initializeApp(): void {
  setupProviders()
  // AuthGuard reads the session status, including 'unavailable' on a network or server error.
  authClient.initialize().catch((_error) => {
    // The client already publishes the failure through the auth store.
  })
}
