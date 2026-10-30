// The stylesheets (src/index.css, src/theme.css) are linked from index.html,
// not imported here: a page then paints styled as soon as its HTML arrives —
// prerendered from the dev server as from the build — instead of waiting for
// this module graph, and stays styled when a component fails to compile.
import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App.js'
import { setupProviders } from './bonds/index.js'
import { ROUTER_BASENAME } from './site.js'

setupProviders()

type HydrationWindow = Window & {
  __molHydrationErrors?: string[]
  __molEntryUrls?: string[]
  __molRoot?: Root
}

/** Marks `<html data-mol-mounted>` once React has committed — the e2e specs wait for it. */
function Mounted() {
  useEffect(() => {
    document.documentElement.setAttribute('data-mol-mounted', '')
  }, [])
  return null
}

const root = document.getElementById('root')!
const tree = (
  <StrictMode>
    <BrowserRouter
      basename={ROUTER_BASENAME}
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
      <App />
      <Mounted />
    </BrowserRouter>
  </StrictMode>
)

// This module can evaluate more than once per document: it defines a
// component (Mounted), so React Refresh makes it a hot-update boundary, and an
// edit that bubbles up past App re-runs it in the live page. A second
// createRoot()/hydrateRoot() on the same container is refused by React (and
// re-hydrating a live tree reads as a hydration mismatch), so the root is kept
// on the window and a re-run renders the new tree into it — which is what a
// hot update means. Every evaluation still records its module URL on the
// window, so an unexpected re-run is diagnosable from the preview's console.
const entryWindow = window as HydrationWindow
;(entryWindow.__molEntryUrls ??= []).push(import.meta.url)

// A page arrives prerendered — scripts/prerender.mjs put this route's markup in
// #root for the build, vite-static-site-plugin.ts does the same for the dev
// server — so hydrate it. A route the entry does not know (the not-found page)
// arrives as the empty shell and mounts from scratch.
if (entryWindow.__molRoot) {
  entryWindow.__molRoot.render(tree)
} else if (root.hasChildNodes()) {
  entryWindow.__molRoot = hydrateRoot(root, tree, {
    // A mismatch between the server markup and the client render is recoverable
    // to React — it drops the markup and renders again on the client — and fatal
    // to the page: the second render has only what the client can produce. Keep
    // every one on the window, where `open()` in e2e/_helpers.ts fails the spec
    // and the preview's console log shows it.
    onRecoverableError(error) {
      const w = window as HydrationWindow
      ;(w.__molHydrationErrors ??= []).push(error instanceof Error ? error.message : String(error))
      console.error(error)
    },
  })
} else {
  entryWindow.__molRoot = createRoot(root)
  entryWindow.__molRoot.render(tree)
}
