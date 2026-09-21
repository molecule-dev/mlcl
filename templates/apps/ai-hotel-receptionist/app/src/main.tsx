// theme.css is imported inside index.css (tailwind entry) so its @theme
// block registers utilities — see the comment there.
import './index.css'

import { bootstrapApp } from '@molecule/app-bonds-default-react'

import { App } from './App.js'
import { authClient, setupProviders } from './bonds/index.js'
import { registerPWA } from './pwa.js'

bootstrapApp({ App, authClient, setupProviders, registerPWA })
