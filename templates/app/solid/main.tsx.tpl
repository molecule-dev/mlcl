import { render } from 'solid-js/web'
import { setupProviders, authClient } from './bonds/index.js'
import { registerPWA } from './pwa.js'
import { App } from './App.js'
import './index.css'
import './theme.css'

setupProviders()

authClient.initialize().catch(() => {})

render(() => <App />, document.getElementById('root')!)

registerPWA()
