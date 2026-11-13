// The stylesheets (src/index.css, src/theme.css) are linked from index.html,
// not imported here: a page then paints styled as soon as its HTML arrives —
// prerendered from the dev server as from the build — instead of waiting for
// this module graph, and stays styled when a component fails to compile.
import { StrictMode, useEffect } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'

import { BrowserRouter } from '@molecule/app-routing-react-router'

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
    <BrowserRouter basename={ROUTER_BASENAME}>
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

// Static hosts can serve index.html for an unknown path. Its canonical URL
// identifies the page that supplied the markup: hydrate that page only at its
// own path, and mount the requested route when the host served a fallback.
const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
const normalizePath = (path: string): string => path.replace(/\/+$/, '') || '/'
const matchingDocument =
  !canonical ||
  normalizePath(new URL(canonical.href).pathname) === normalizePath(window.location.pathname)
if (entryWindow.__molRoot) {
  entryWindow.__molRoot.render(tree)
} else if (root.hasChildNodes() && matchingDocument) {
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
  root.replaceChildren()
  entryWindow.__molRoot = createRoot(root)
  entryWindow.__molRoot.render(tree)
}
