import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setupProviders, authClient } from './bonds/index.js'
import { registerPWA } from './pwa.js'
import { App } from './App.js'
import './index.css'
import './theme.css'

setupProviders()

authClient.initialize().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

registerPWA()
