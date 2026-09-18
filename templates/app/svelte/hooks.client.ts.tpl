import { setupProviders, authClient } from '$lib/bonds/index.js'
import { registerPWA } from '$lib/pwa.js'

setupProviders()

authClient.initialize().catch(() => {})

registerPWA()
