// The stylesheets (src/index.css, src/theme.css) are linked from index.html,
// not imported here: a page then paints styled as soon as its HTML arrives —
// prerendered from the dev server as from the build — instead of waiting for
// this module graph, and stays styled when a component fails to compile.
import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import { App } from './App.js'
import { setupProviders } from './bonds/index.js'
import { ROUTER_BASENAME } from './site.js'

setupProviders()

type HydrationWindow = Window & { __molHydrationErrors?: string[]; __molEntryUrls?: string[] }

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
    <BrowserRouter basename={ROUTER_BASENAME}>
      <App />
      <Mounted />
    </BrowserRouter>
  </StrictMode>
)

// This module evaluates once per document. If it ever evaluates twice, React
// refuses the second root ("createRoot() on a container that has already been
// passed to createRoot()") and re-hydrates a tree that is already live — which
// is how a theme toggle came to be reported as a hydration mismatch. The mount
// is therefore guarded, and every evaluation records its module URL on the
// window, so a second one is diagnosable from the preview's console: two
// entries with different URLs name the import that ran it again.
const entryWindow = window as HydrationWindow
;(entryWindow.__molEntryUrls ??= []).push(import.meta.url)
if (entryWindow.__molEntryUrls.length > 1) {
  console.error(
    '[static-site] the app entry was evaluated again — mount skipped',
    entryWindow.__molEntryUrls,
  )
}

// A page arrives prerendered — scripts/prerender.mjs put this route's markup in
// #root for the build, vite-static-site-plugin.ts does the same for the dev
// server — so hydrate it. A route the entry does not know (the not-found page)
// arrives as the empty shell and mounts from scratch.
if (entryWindow.__molEntryUrls.length > 1) {
  // already mounted by the first evaluation
} else if (root.hasChildNodes()) {
  hydrateRoot(root, tree, {
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
  createRoot(root).render(tree)
}
