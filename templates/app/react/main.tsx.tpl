import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupProviders, authClient } from './bonds/index.js'
import { registerPWA } from './pwa.js'
import { App } from './App.js'
import './index.css'
import './theme.css'

setupProviders()

// Restore the stored session before the first page renders. A rejected restore
// needs no handling here: the client keeps the stored token on a network/5xx
// failure, settles its status as 'unavailable', and publishes that through the
// auth store — AuthGuard and every page read the status, not this promise — so
// nothing is lost by not reporting it twice.
authClient.initialize().catch((_error) => {
  // Intentionally ignored: the failure is already published as auth status.
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerPWA()
