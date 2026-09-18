import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router'

import type { StaticFile } from '../vite-static-site-plugin.js'
import { App } from './App.js'
import { setupProviders } from './bonds/index.js'
import { APP_DESCRIPTION, APP_NAME } from './branding.js'
import { readPageMeta, resetPageMeta } from './components/PageMeta.js'
import { ROUTER_BASENAME, withBase } from './site.js'

/**
 * The build-time entry — what scripts/prerender.mjs calls to write `dist/`.
 * It runs in Node, not a browser: nothing here may touch `window` or
 * `document`. The same `<App />` the browser mounts renders here, so a page
 * is never written twice.
 *
 * Adding a page: add its route to App.tsx and its path to STATIC_PATHS. A
 * path is written as `dist/<path>/index.html`, so keep the trailing slash.
 */

/** Every route the build writes as an HTML page. */
export const STATIC_PATHS: string[] = ['/', '/about/']

/** One rendered page, as the prerender writes it into the shell. */
export interface RenderedPage {
  html: string
  title: string
  description: string
  /** Extra markup for `<head>` — alternate links, a canonical, JSON-LD. */
  head?: string
}

setupProviders()

/** The paths to render — see STATIC_PATHS. */
export function getStaticPaths(): string[] {
  return STATIC_PATHS
}

/**
 * Non-HTML files to publish next to the pages (feeds, sitemap, JSON). None
 * for a plain site; return `{ path, content }` entries to add some.
 */
export function getStaticFiles(): StaticFile[] {
  return []
}

/**
 * Render one route to markup plus its document metadata.
 *
 * @param path - Site-relative path, as listed in STATIC_PATHS.
 * @returns The page for scripts/prerender.mjs to write.
 */
export function render(path: string): RenderedPage {
  resetPageMeta()
  const html = renderToStaticMarkup(
    <StaticRouter basename={ROUTER_BASENAME} location={withBase(path)}>
      <App />
    </StaticRouter>,
  )
  const meta = readPageMeta()
  return {
    html,
    title: meta.title ? `${meta.title} | ${APP_NAME}` : APP_NAME,
    description: meta.description || APP_DESCRIPTION,
  }
}
