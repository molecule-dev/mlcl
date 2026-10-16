import { rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { Plugin } from 'vite'

import { molE2EPreviewPlugin } from '@molecule/app-e2e-preview/vite'

/**
 * The molecule PREVIEW plugins — the plumbing that exists only so the
 * molecule.dev IDE can frame this app's dev server as a live preview:
 *
 * 1. Strip the preview / diagnostics bridges from PRODUCTION builds (below).
 * 2. Drop the bridges' SCRIPT FILES from the build output (`__mol/bridges/`).
 * 3. The e2e transport (`@molecule/app-e2e-preview/vite`): in `vite` dev and
 *    `vite preview` it serves a tiny page client, injects it into every
 *    document and attaches a WebSocket hub to the server, so the e2e specs in
 *    `e2e/` can drive the live preview as a Playwright-shaped page
 *    (`MOL_E2E_PROVIDER=preview npm run test:e2e`; by default a molecule
 *    sandbox runs them on the Chromium it ships, with no tab involved). Inert
 *    in `vite build`. Turn it off with `MOL_E2E_PREVIEW_PLUGIN=0`.
 *
 * The preview bridges — the `<!-- mol:preview-bridge -->` runtime-diagnostics
 * sender (`molecule:error` / `runtime-error` / `blank` / `ready` / `heartbeat`)
 * plus the `mol:nav-bridge` navigation reporter, the `mol:snapshot-bridge`
 * snapshot/liveness sender, the `mol:runtime-bridge` heartbeat/runtime-error
 * reporter and the `mol:interact-bridge` remote-control receiver — all exist ONLY
 * so the molecule.dev IDE — which frames the Vite DEV server — can drive its
 * preview overlay. Each posts to `window.parent` with a wildcard target origin
 * (`postMessage(data, '*')`): `molecule:navigate` leaks the live in-app URL,
 * `molecule:snapshot` a JPEG of the rendered (possibly authenticated) page,
 * `molecule:runtime-error` the app's own stack traces, and the interact bridge
 * accepts commands that click and fill the page. In a DEPLOYED production build
 * the app can be framed by a malicious page, which would then receive that
 * stream cross-origin (information disclosure). The IDE never frames the
 * production build, so none of it may ship.
 *
 * The script BODIES live in `public/__mol/bridges/<name>.js` and `index.html`
 * carries one `<script src>` per bridge (`<!-- mol:<name> -->` + tag): the
 * scaffold writes them there so the entry document — which the IDE's AI executor
 * reads as its first look at the app — stays a few KB instead of the 63 KB it
 * was when the five bridges were inlined into it (X0 flash-m77 spent ~3 minutes
 * of its plan phase re-reading files the 63 KB read had pushed out of context).
 *
 * The strip plugin runs ONLY on `vite build` (`apply: 'build'`) and removes every
 * delimited region (inclusive) and every sentinel + `<script>` pair from the
 * emitted HTML, so the user's production deploy ships without it. Plain `vite`
 * (dev) keeps the bridges intact so the IDE live preview keeps working.
 * Dependency-free — a pure regex over the HTML string, so it carries no extra
 * build dependency.
 *
 * It also strips every SIBLING preview bridge injected at scaffold/boot time —
 * the `mol:nav-bridge` navigation reporter, the `mol:snapshot-bridge`
 * snapshot/liveness sender, the `mol:runtime-bridge` heartbeat/runtime-error
 * reporter and the `mol:interact-bridge` remote-control receiver. Each posts to
 * `window.parent` with a wildcard origin: `molecule:navigate` leaks the live
 * in-app URL, `molecule:snapshot` a JPEG of the rendered (possibly
 * authenticated) page, `molecule:runtime-error` the app's own stack traces, and
 * the interact bridge accepts commands that click and fill the page. None of it
 * may ship in production.
 *
 * The strip is written against the NAMING CONVENTION, not a list of names. Every
 * bridge is `mol:<name>-bridge` (or `mol:<name>-shim`), injected either as a
 * `:start`/`:end` delimited region or as a sentinel comment immediately followed
 * by one inline `<script>`. Matching the convention is the point: a literal list
 * silently falls behind whatever the platform injects next — which is exactly
 * how `mol:runtime-bridge` (~5 KB) and `mol:interact-bridge` (~28 KB) shipped in
 * production builds fleet-wide, still posting diagnostics to any page that
 * framed them. A new bridge is stripped the day it is named, with no edit here.
 *
 * The script form requires the `<script>` to FOLLOW the sentinel directly, so
 * unrelated molecule markers that are not preview plumbing (`mol:fonts`,
 * `mol:design-resources`) can never be swallowed.
 */

/** A molecule preview-plumbing sentinel name: `mol:<name>-bridge` / `-shim`. */
const SENTINEL = String.raw`mol:[a-z0-9]+(?:-[a-z0-9]+)*-(?:bridge|shim)`

/** `<!-- mol:x-bridge:start -->` … `<!-- mol:x-bridge:end -->`, inclusive. */
const DELIMITED_REGION = new RegExp(
  String.raw`[ \t]*<!--\s*(${SENTINEL}):start\s*-->[\s\S]*?<!--\s*\1:end\s*-->[ \t]*\n?`,
  'g',
)

/** `<!-- mol:x-bridge -->` plus the single inline `<script>` that follows it. */
const SENTINEL_SCRIPT = new RegExp(
  String.raw`[ \t]*<!--\s*${SENTINEL}\s*-->\s*<script\b[^>]*>[\s\S]*?<\/script>[ \t]*\n?`,
  'g',
)

/**
 * Remove every molecule preview bridge from an HTML document.
 *
 * Exported so a build can be asserted on directly (see the test that feeds it a
 * document carrying every sentinel and requires that none survive).
 *
 * @param html - The document to strip.
 * @returns The document with every bridge region and bridge script removed.
 */
export const stripPreviewBridges = (html: string): string =>
  html.replace(DELIMITED_REGION, '').replace(SENTINEL_SCRIPT, '')

const stripBridgesOnBuild: Plugin = {
  name: 'molecule-strip-preview-bridge',
  apply: 'build',
  transformIndexHtml: {
    order: 'pre',
    handler: (html: string): string => stripPreviewBridges(html),
  },
}

/** Where `index.html` finds the bridge scripts, and where Vite copies them from. */
const BRIDGE_ASSET_DIR = '__mol'

/**
 * Directory of the build output being written, captured from the resolved config.
 * `closeBundle` still has the plugin context, but not the config.
 */
let buildOutDir = 'dist'

/**
 * Delete the bridge scripts from the build output.
 *
 * They live in `public/__mol/bridges/*.js` so the DEV server serves them as
 * plain static files (that is what the tags above point at). Vite copies
 * `publicDir` into the build output wholesale, and by the time it does, the tags
 * that loaded them are already stripped — so without this the deployed app would
 * ship ~59 KB of unreachable bridge scripts, the exact bytes the strip exists to
 * keep out of production. `closeBundle` is the first point at which the output
 * directory exists to delete from.
 *
 * Exported so a build can be asserted on directly (see the test that builds one).
 *
 * @param outDir - Absolute path to the build output directory.
 */
export const dropBridgeAssets = (outDir: string): void => {
  rmSync(join(outDir, BRIDGE_ASSET_DIR), { recursive: true, force: true })
}

const dropBridgeAssetsOnBuild: Plugin = {
  name: 'molecule-drop-preview-bridge-assets',
  apply: 'build',
  configResolved(config) {
    buildOutDir = resolve(config.root, config.build.outDir)
  },
  closeBundle() {
    dropBridgeAssets(buildOutDir)
  },
}

/**
 * Every preview plugin, as one entry for `plugins: [...]` (Vite flattens nested
 * plugin arrays). Kept under the original name so every scaffolded
 * `vite.config.ts` picks up the e2e transport without changing.
 */
export const stripPreviewBridgePlugin = (): Plugin[] => [
  stripBridgesOnBuild,
  dropBridgeAssetsOnBuild,
  molE2EPreviewPlugin(),
]
