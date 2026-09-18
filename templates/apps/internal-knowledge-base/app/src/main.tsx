import './index.css'
import './theme.css'

import { bootstrapApp } from '@molecule/app-bonds-default-react'

import { App } from './App.js'
import { authClient, setupProviders } from './bonds/index.js'
import { registerPWA } from './pwa.js'

bootstrapApp({ App, authClient, setupProviders, registerPWA })
