import './index.css'
import './theme.css'

import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App.js'
import { setupProviders } from './bonds/index.js'
import { ROUTER_BASENAME } from './site.js'

setupProviders()

const root = document.getElementById('root')!
const tree = (
  <StrictMode>
    <BrowserRouter basename={ROUTER_BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// A built page (`npm run build`) arrives prerendered — scripts/prerender.mjs
// already put this route's markup in #root — so hydrate it. The dev server
// serves the empty shell, so mount from scratch.
if (root.hasChildNodes()) {
  hydrateRoot(root, tree)
} else {
  createRoot(root).render(tree)
}
