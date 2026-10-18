import { type Dirent, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

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
 *
 * A BRIDGE SCRIPT REFERENCE is stripped by its `src`, not by its position. The
 * bridges are files under `/__mol/bridges/`, and a tag can end up separated from
 * the sentinel that used to own it — on X0 flash-m179 an edit inserted a second
 * bridge tag between `<!-- mol:nav-bridge -->` and the tag that followed it, the
 * sentinel-pair rule consumed only the inserted one, and the surviving
 * `nav-bridge.js` tag pointed at a file `dropBridgeAssets` deletes. The deployed
 * page then loaded the SPA fallback as JavaScript (`SyntaxError: Unexpected
 * token '<'`) and needed a second deploy. Every `<script>` whose `src` resolves
 * under the platform-owned `/__mol/` tree is now removed wherever it sits, and
 * the sentinel comments are removed independently of what follows them. An
 * app's own scripts never match — they do not point into `__mol`.
 */

/** A molecule preview-plumbing sentinel name: `mol:<name>-bridge` / `-shim`. */
const SENTINEL = String.raw`mol:[a-z0-9]+(?:-[a-z0-9]+)*-(?:bridge|shim)`

/** `<!-- mol:x-bridge:start -->` … `<!-- mol:x-bridge:end -->`, inclusive. */
const DELIMITED_REGION = new RegExp(
  String.raw`[ \t]*<!--\s*(${SENTINEL}):start\s*-->[\s\S]*?<!--\s*\1:end\s*-->[ \t]*\n?`,
  'g',
)

/**
 * `<!-- mol:x-bridge -->` plus the single INLINE `<script>` (no `src`) that
 * follows it directly — the older bridge form.
 *
 * A following `<script src>` is NOT part of this pair: it is handled by
 * {@link BRIDGE_SCRIPT} on its own, so it is never consumed by a sentinel that
 * did not refer to it.
 */
const SENTINEL_INLINE_SCRIPT = new RegExp(
  String.raw`[ \t]*<!--\s*${SENTINEL}\s*-->\s*<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>[ \t]*\n?`,
  'g',
)

/**
 * Any `<script>` whose `src` resolves under the platform-owned `__mol` tree
 * (`/__mol/bridges/<name>.js`), wherever it sits relative to a sentinel comment.
 *
 * The path test is on the WHOLE `__mol` directory, not only `bridges`, because
 * {@link dropBridgeAssets} deletes the whole directory: any surviving reference
 * into it loads the production SPA fallback as JavaScript.
 */
const BRIDGE_SCRIPT = new RegExp(
  String.raw`[ \t]*<script\b[^>]*\bsrc\s*=\s*["'](?:[^"']*\/)?__mol\/[^"']*["'][^>]*>[\s\S]*?<\/script>[ \t]*\n?`,
  'gi',
)

/** A bridge sentinel comment left without a script (or after both were removed). */
const SENTINEL_COMMENT = new RegExp(String.raw`[ \t]*<!--\s*${SENTINEL}\s*-->[ \t]*\n?`, 'g')

/**
 * Remove every molecule preview bridge from an HTML document.
 *
 * Order matters: delimited regions, then the legacy sentinel + inline-script
 * pair, then EVERY bridge script reference by `src` (an inserted tag can leave a
 * sentinel owning a tag it no longer describes), then any sentinel comments left
 * over. The `src` pass is what makes stripping independent of document order.
 *
 * Exported so a build can be asserted on directly (see the test that feeds it a
 * document carrying every sentinel and requires that none survive).
 *
 * @param html - The document to strip.
 * @returns The document with every bridge region and bridge script removed.
 */
export const stripPreviewBridges = (html: string): string =>
  html
    .replace(DELIMITED_REGION, '')
    .replace(SENTINEL_INLINE_SCRIPT, '')
    .replace(BRIDGE_SCRIPT, '')
    .replace(SENTINEL_COMMENT, '')

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

/** The URL prefix whose references must never survive into production HTML. */
const BRIDGE_URL_MARKER = '/__mol/'

/**
 * Fail the build when an emitted HTML document still points into `__mol`.
 *
 * `dropBridgeAssets` deletes the whole tree, so a surviving reference is not a
 * stale asset — it is a URL the deployed server answers with the SPA fallback,
 * whose HTML the browser then parses as JavaScript (`SyntaxError: Unexpected
 * token '<'`). That shipped once (X0 flash-m179) and cost a second deploy. The
 * strip above is the fix; this is the gate that makes a future leak fail the
 * build, by file name, instead of the production page.
 *
 * Exported so a build can be asserted on directly.
 *
 * @param outDir - Absolute path to the build output directory.
 * @throws {Error} Naming every emitted `.html` file that still references `/__mol/`.
 */
export const assertNoBridgeReferences = (outDir: string): void => {
  const offenders: string[] = []
  const walk = (dir: string): void => {
    let entries: Dirent[]
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch (_error) {
      // The output directory does not exist — nothing was emitted to check.
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
      } else if (/\.html?$/i.test(entry.name)) {
        if (readFileSync(full, 'utf8').includes(BRIDGE_URL_MARKER)) {
          offenders.push(relative(outDir, full))
        }
      }
    }
  }
  walk(outDir)
  if (offenders.length > 0) {
    throw new Error(
      `Production HTML still references /__mol/ (${offenders.join(', ')}). The bridge scripts ` +
        'are deleted from the build output, so these URLs would return the SPA fallback and be ' +
        'parsed as JavaScript. stripPreviewBridges must remove every bridge script and sentinel.',
    )
  }
}

const assertNoBridgeReferencesOnBuild: Plugin = {
  name: 'molecule-assert-no-bridge-references',
  apply: 'build',
  configResolved(config) {
    buildOutDir = resolve(config.root, config.build.outDir)
  },
  writeBundle() {
    assertNoBridgeReferences(buildOutDir)
  },
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
  assertNoBridgeReferencesOnBuild,
  dropBridgeAssetsOnBuild,
  molE2EPreviewPlugin(),
]
