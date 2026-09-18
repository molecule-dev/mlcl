import type { Plugin } from 'vite'

import { molE2EPreviewPlugin } from '@molecule/app-e2e-preview/vite'

/**
 * The molecule PREVIEW plugins — the plumbing that exists only so the
 * molecule.dev IDE can frame this app's dev server as a live preview:
 *
 * 1. Strip the preview / diagnostics bridge from PRODUCTION builds (below).
 * 2. The e2e transport (`@molecule/app-e2e-preview/vite`): in `vite` dev and
 *    `vite preview` it serves a tiny page client, injects it into every
 *    document and attaches a WebSocket hub to the server, so the e2e specs in
 *    `e2e/` can drive the live preview as a Playwright-shaped page
 *    (`npm run test:e2e` inside a molecule sandbox, where there is no browser
 *    binary). Inert in `vite build`. Turn it off with `MOL_E2E_PREVIEW_PLUGIN=0`.
 *
 * `index.html` carries an inline `<script>` "preview bridge" — delimited by
 * `<!-- mol:preview-bridge:start -->` / `<!-- mol:preview-bridge:end -->` — that,
 * when the page is framed, posts `molecule:*` runtime diagnostics
 * (error / runtime-error / blank / ready / heartbeat) to `window.parent` with a
 * wildcard target origin (`postMessage(data, '*')`). It exists ONLY so the
 * molecule.dev IDE — which frames the Vite DEV server — can drive its preview
 * overlay. In a DEPLOYED production build the app can be framed by a malicious
 * page, which would then receive that diagnostic stream cross-origin
 * (information disclosure). The IDE never frames the production build, so the
 * bridge is purely dev/preview tooling.
 *
 * The strip plugin runs ONLY on `vite build` (`apply: 'build'`) and removes every
 * delimited region (inclusive) from the emitted HTML, so the user's production
 * deploy ships without it. Plain `vite` (dev) keeps the bridge intact so the IDE
 * live preview keeps working. Dependency-free — a pure regex over the HTML
 * string, so it carries no extra build dependency.
 *
 * It also strips the two sibling preview bridges injected at scaffold/boot time
 * (the `mol:nav-bridge` navigation reporter and the `mol:snapshot-bridge`
 * snapshot/liveness sender). Those carry their own sentinel comments rather than
 * the start/end delimiters and also post to `window.parent` with a wildcard
 * origin — `molecule:navigate` leaks the live in-app URL and `molecule:snapshot`
 * a JPEG of the rendered (possibly authenticated) page — so they must not ship in
 * production either. Each is a single inline `<script>` immediately after its
 * sentinel, so we match the sentinel through its first `</script>`.
 */
const stripBridgesOnBuild: Plugin = {
  name: 'molecule-strip-preview-bridge',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    handler: (html: string): string =>
      html
        .replace(
          /[ \t]*<!-- mol:preview-bridge:start -->[\s\S]*?<!-- mol:preview-bridge:end -->\n?/g,
          '',
        )
        .replace(/[ \t]*<!-- mol:nav-bridge -->[\s\S]*?<\/script>\n?/g, '')
        .replace(/[ \t]*<!-- mol:snapshot-bridge -->[\s\S]*?<\/script>\n?/g, ''),
  },
}

/**
 * Both preview plugins, as one entry for `plugins: [...]` (Vite flattens nested
 * plugin arrays). Kept under the original name so every scaffolded
 * `vite.config.ts` picks up the e2e transport without changing.
 */
export const stripPreviewBridgePlugin = (): Plugin[] => [stripBridgesOnBuild, molE2EPreviewPlugin()]
