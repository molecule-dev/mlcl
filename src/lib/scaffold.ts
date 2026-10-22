/**
 * Project scaffolding library — creates project skeletons programmatically.
 *
 * Extracted from the `create` command so it can be called programmatically
 * (e.g., by the molecule.dev AI service, or by other tooling).
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'

/** Dev-only diagnostic printer — silent unless MLCL_DEBUG=1. */
function mlclDebug(msg: string): void {
  if (process.env.MLCL_DEBUG === '1') console.error(msg)
}
import {
  chmod,
  copyFile,
  mkdir,
  readdir,
  readFile,
  readlink,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { filterEnvSecrets, renderEnvSecretLines, resolveDatabaseUrlValue } from './env-file.js'
import { collectSecrets } from './features.js'
import { sortImportStatements } from './format.js'
import type { InferredMetadata } from './infer.js'
import { injectLogo } from './logo-injector.js'
import { ensureMigrateRunnerImports, refreshMigrateRunnerForManifest } from './migrate-runner.js'
import {
  databasePackageOf,
  migrationDialectHeader,
  projectDatabasePackage,
  stampMigrationDialect,
} from './migration-dialect.js'
import {
  detectAppFramework,
  getMoleculeVersion,
  getRawRegistry,
  loadApiFrameworks,
  loadAppFrameworks,
  loadRegistry,
  loadToolchain,
} from './registry.js'
import type { BuildTooling, InferredPackage, MoleculeSecret } from './schema.js'
import { generateSecretValues } from './secret-generate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Write `next` to `path`, restoring the file's previous bytes when the write
 * fails part-way.
 *
 * `writeFile` opens with the `w` flag, which TRUNCATES before it writes, so a
 * failure mid-write (a full disk, EIO) replaces a good file with a partial one.
 * For the files this module rewrites inside a project that ALREADY exists — the
 * app's `index.html`, `src/bonds/index.ts`, a workspace `package.json` — that is
 * strictly worse than not writing at all: the entry HTML no longer parses,
 * `index.ts` imports a module the same step just removed, the manifest is
 * unparseable for every later step. Same policy as
 * `writeMigrateRunnerGuarded` (migrate-runner.ts): a failed write leaves the
 * file as it was, never worse — previous bytes restored when there were any, a
 * partial file this call created removed when there were not.
 *
 * An unreadable PRE-EXISTING file (EACCES) is NOT treated as "created by this
 * call": recording it as absent would make the failure path `rm` a file that
 * predates the write. That read failure is rethrown instead (the write behind it
 * cannot succeed either), leaving the file exactly as it was.
 *
 * @param path - The file to write.
 * @param next - The full content to write.
 */
async function writeGuarded(path: string, next: string | Uint8Array): Promise<void> {
  let prior: Buffer | null
  try {
    prior = await readFile(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    prior = null
  }
  try {
    await writeFile(path, next, 'utf-8')
  } catch (error) {
    try {
      if (prior === null) await rm(path, { force: true })
      else await writeFile(path, prior)
    } catch (_restoreError) {
      // Best-effort restore: the primary failure is rethrown below, and the
      // original bytes are already on disk unless the restore itself failed.
    }
    throw error
  }
}

/**
 * Whether `candidate` resolves to a path strictly INSIDE `baseDir` (the
 * directory itself does not count — it is not a file).
 *
 * The paths this module derives from package/registry METADATA and from a
 * project's own manifest (a font package's `molecule.font.fontsDir`/`faces[].file`,
 * the `@molecule/*` dependency keys that name the package) are data, and not
 * necessarily trustworthy data: `scanPackage` reads a package's metadata from
 * its own `package.json`, and `join()` resolves a `../…` happily — so an
 * unchecked `join(nodeModules, name, fontsDir, file)` reads a file from
 * anywhere the process can read and copies it into the project's SERVED static
 * directory (`public/`). Both sides are compared as RESOLVED paths, which is
 * also what catches an absolute `candidate` (`join(base, '/etc/passwd')` folds
 * it into `base`, so a prefix check on the joined string would call it inside).
 *
 * @param baseDir - The directory the path must stay within.
 * @param candidate - The path to check.
 * @returns True when `candidate` is a path strictly inside `baseDir`.
 */
function isInsideDir(baseDir: string, candidate: string): boolean {
  const inside = relative(baseDir, candidate)
  return inside !== '' && inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside)
}

// ---------------------------------------------------------------------------
// Self-documenting headers for theme files
//
// The #1 "executor edited the wrong/dead file" failure was recoloring: the
// theme bond (`app-theme-css-variables.ts`) looks like where colors live, but
// in template-based apps a per-app `theme.css` hardcodes the `--color-*`
// variables and SHADOWS the bond (same :root specificity, loaded last). So the
// visible palette comes only from theme.css; editing the bond does nothing.
// Rather than patch the system prompt per-issue, the files document themselves:
// the executor MUST open a file to edit it, so a header there is the most
// reliable channel. Injected at scaffold time so every app (custom + all
// templates + future ones) gets it from one place — no per-file sweep.
// ---------------------------------------------------------------------------

/** Header prepended to a template app's populated `theme.css` (theme.css IS the palette). */
const THEME_CSS_HEADER_TEMPLATE = `/* =============================================================================
 * APP COLOR PALETTE — this file is the source of truth for this app's colors.
 *
 * To RECOLOR the app (e.g. "make it blue"), edit the \`--color-*\` variables below:
 *   :root { … }                      → light theme
 *   [data-mol-mode='dark'] { … }     → dark theme
 * Change the value in BOTH blocks. These drive the ENTIRE UI — every ClassMap
 * class (bg-primary, text-primary, cm.surface, …) and Tailwind token resolves to
 * these variables. Changing a CORE token (e.g. --color-primary) auto-updates all
 * its derived shades (hover, container, on-primary, …) via color-mix.
 *
 * Do NOT edit app/src/bonds/app-theme-css-variables.ts to recolor — its values
 * are overridden by this file and have NO visible effect; that bond only toggles
 * light/dark mode.
 *
 * Related, for a COMPLETE rebrand (these are separate from the UI palette above):
 *   • Logo / favicon / PWA manifest color → BRAND_COLOR in app/src/branding.ts
 *     (drives the generated logo SVG, app icons, and <meta theme-color>).
 *   • Font → set --font-family below and load the family LOCALLY: the
 *     @molecule/app-fonts-* bonds ship 20 families (Source Sans Pro is
 *     source-sans-3, plus Inter, Lora, IBM Plex, …) and setFont(font) injects
 *     the @font-face — do NOT npm install a webfont package for a covered family.
 *     A family with no bond goes in app/index.html's <!-- mol:fonts --> block.
 * ============================================================================= */
`

/** Header for the default (empty) `theme.css` in custom builds (bond drives colors until overridden). */
const THEME_CSS_HEADER_CUSTOM = `/* =============================================================================
 * APP COLOR PALETTE — recolor the app by adding \`--color-*\` overrides here.
 *
 * This project has no per-app palette yet, so colors come from the theme bond
 * defaults (app/src/bonds/app-theme-css-variables.ts). To customize, add
 * overrides here — they win over the bond:
 *   :root { --color-primary: #1565c0; … }   → light theme
 *   [data-mol-mode='dark'] { --color-primary: #42a5f5; … } → dark theme
 * These drive the ENTIRE UI (bg-primary, text-primary, cm.surface, …); changing a
 * CORE token auto-updates its derived shades via color-mix. Alternatively edit
 * the theme objects in the bond — but prefer overriding here.
 * ============================================================================= */
`

/** Redirect header injected into a template app's theme bond (colors live in theme.css). */
const THEME_BOND_REDIRECT_HEADER = `/*
 * ⚠️ COLORS ARE NOT DEFINED HERE. This app's palette lives in app/src/theme.css
 * (the --color-* variables), which OVERRIDES anything set here. To recolor the
 * app, edit theme.css — NOT this file. This bond only wires light/dark mode.
 */
`

/**
 * Header prepended to every app's `branding.ts` (branding.ts IS the brand source).
 *
 * Injected at scaffold time on BOTH paths — flagship `--template` instances
 * (copyTemplateInstance) and custom builds (copyTemplateFiles) — so the executor
 * that opens this file to rename/rebrand learns, in-file, that everything else is
 * DERIVED from here and must not be hardcoded elsewhere.
 */
const BRANDING_HEADER = `/* =============================================================================
 * APP BRANDING — this file is the single source of truth for this app's identity.
 *
 * APP_NAME / APP_DESCRIPTION / BRAND_COLOR below drive the browser-tab <title>,
 * the social + PWA meta tags, the generated logo/icons, and the package.json
 * name + description — all were derived FROM this file at scaffold time. That
 * sync ran once, at scaffold time: after it, a rename edits the values here AND
 * the copies below, which do not re-read this file at runtime:
 *   • app/index.html <title> + og/twitter/apple title  ← APP_NAME
 *     ...description meta + theme-color meta            ← APP_DESCRIPTION / BRAND_COLOR
 *   • root/app/api package.json name + description      ← synced from here + project name
 *   • app/src/locales/<lang>/ui.ts strings              → prefer t('app.name', …)
 *     over a literal product name so a rename here flows through every locale
 * After changing BRAND_COLOR or replacing public/logo.svg, run:
 *   npm run generate-icons   (rebuilds favicon, PWA icons, splash, OG, + HTML meta)
 * ============================================================================= */
`

/**
 * The branding header for an app whose pages are all written by its own build
 * (no `app/index.html` — the static-site-thin template): there is no copy to
 * keep in sync, because every title, meta tag and feed reads this file each
 * time the site is built.
 */
const BUILD_TIME_BRANDING_HEADER = `/* =============================================================================
 * SITE BRANDING — the single source of truth for this site's identity.
 *
 * APP_NAME / APP_DESCRIPTION / BRAND_COLOR are read by the build every time it
 * runs: page titles, the header, meta tags, the feeds, the sitemap and llms.txt
 * all come from here. Change a value and the next build (the dev server's
 * included) uses it everywhere — do not repeat these values in other files.
 * ============================================================================= */
`

/**
 * Prepend a header to a file's content if not already present (idempotent).
 * @param content - The original file content.
 * @param header - The header block to prepend.
 * @returns The content with the header prepended (or unchanged if present).
 */
function withHeader(content: string, header: string): string {
  const marker = header.split('\n')[1] ?? header.slice(0, 40)
  return content.includes(marker.trim()) ? content : header + content
}

// ---------------------------------------------------------------------------
// Demo-content notices
//
// Every flagship ships placeholder content so a fresh scaffold has something to
// show in the preview: the static-site template's sample posts, each app's
// `api/fixtures/*.json`, and the demo rows its seed module writes. When the
// user brings their OWN content the placeholders must not survive into their
// app — and on 2026-09-16 a live run published all thirteen of the static-site
// template's sample posts as the user's blog while the five files they had
// shared never reached the site at all.
//
// Nothing in the project said so, so these notices say it at the point of use:
// a README beside the placeholder data and a header on the seed module the
// executor has to open to change the seeding. Same channel as the theme and
// branding headers above, injected once here so it reaches every app — every flagship
// flagship templates and any future one — without sweeping N template dirs.
// ---------------------------------------------------------------------------

/** README written into a template app's markdown content directory. */
const DEMO_CONTENT_README = `# Sample content

The posts in \`posts/\` came with the template so the site had something to show
on its first preview. They are placeholders — nobody wrote them for this site.

When real content arrives (files the owner shared, an import, a paste) it
REPLACES these samples: delete them in the same change, unless the owner asks
to keep them. Publishing the owner's posts next to the template's by accident
is a bug, not a fuller site.

Each sample carries \`templateDemo: true\` in its front matter, and the build
leaves every marked post out as soon as the directory holds one post without
that marker — so a post you write can never be the one dropped, and the samples
cannot outlive real content by accident.
`

/** README written into a template app's `api/fixtures/` directory. */
const DEMO_FIXTURES_README = `# Sample data

These JSON files came with the template. The mock API server
(\`@molecule/api-mock-server\`) serves them for tests, screenshots and frontend
work without a real backend, and some apps seed their database from them.

They are placeholders — not anyone's real records. When the owner supplies
their own data, rewrite or delete these files rather than adding theirs
alongside — the owner's records and the template's samples should not both end
up in the app unless the owner asks for that.
`

/** Header prepended to a template app's database seed module. */
const DEMO_SEED_HEADER = `/* =============================================================================
 * DEMO SEED DATA — placeholder rows, not anyone's real records.
 *
 * This file exists so a fresh install has something to show. When the owner
 * supplies their own data, it REPLACES these rows: seed from their data
 * instead, or stop calling this. Never seed both unless the owner asks for it —
 * the owner's records mixed in with the template's samples by accident is a
 * bug, not a fuller demo.
 * ============================================================================= */
`

/** File names that are a database seed module (checked under \`api/src/\`). */
const SEED_FILE_RE = /^_?seed[-A-Za-z0-9]*\.ts$/

/**
 * Write the demo-content notices into a scaffolded project.
 *
 * Idempotent and entirely additive: a README is written only where the
 * placeholder directory exists and has no README yet, and the seed header is
 * prepended through {@link withHeader}. Safe to call on both scaffold paths.
 *
 * @param appDir - The project's `app/` directory, or null when there is none.
 * @param apiDir - The project's `api/` directory, or null when there is none.
 */
export async function stampDemoContentNotices(
  appDir: string | null,
  apiDir: string | null,
): Promise<void> {
  if (appDir) {
    const contentDir = join(appDir, 'content')
    const contentReadme = join(contentDir, 'README.md')
    if (existsSync(contentDir) && !existsSync(contentReadme)) {
      await writeFile(contentReadme, DEMO_CONTENT_README)
    }
  }
  if (!apiDir) return
  const fixturesDir = join(apiDir, 'fixtures')
  const fixturesReadme = join(fixturesDir, 'README.md')
  if (existsSync(fixturesDir) && !existsSync(fixturesReadme)) {
    await writeFile(fixturesReadme, DEMO_FIXTURES_README)
  }
  const srcDir = join(apiDir, 'src')
  if (!existsSync(srcDir)) return
  const walk = async (dir: string): Promise<void> => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist') continue
        await walk(full)
      } else if (entry.isFile() && SEED_FILE_RE.test(entry.name)) {
        // In-place rewrite of an existing file — through the guard, so a failed
        // write restores the seed's bytes instead of truncating it.
        await writeGuarded(full, withHeader(await readFile(full, 'utf-8'), DEMO_SEED_HEADER))
      }
    }
  }
  await walk(srcDir)
}

/** What `.mol-scratch/` is for, written where whoever opens the project will see it. */
const SCRATCH_README = `# .mol-scratch

Throwaway scripts live here: a probe, a one-off measurement, a scratch fixture.
Write it, run it, delete it.

This directory is git-ignored (the project's \`.gitignore\` ignores \`.mol-*\`), and
that is the point. Deleting a file the repository does not track discards nothing,
so it happens without stopping to ask anyone. A throwaway written NEXT TO the
app's source is tracked the moment it is committed, and removing it then looks
exactly like discarding real work — which is why it interrupts with a
confirmation, every time.

Nothing here is part of the app. It is never imported, never built, never
deployed.
`

/**
 * Create the project's scratch directory so the convention EXISTS rather than
 * only being described.
 *
 * Synthase's system prompt already says throwaway scripts belong in
 * `.mol-scratch/`, and the project's `.gitignore` already ignores `.mol-*` — but
 * nothing ever created the directory, so a rule about a path that is not there
 * competes with the obvious thing: writing the probe beside the source. X0
 * rehearsal 84 watched exactly that happen, twice in one round: a driver script
 * under `scratch/` and two probe specs in `e2e/`, all committed, so removing them
 * afterwards was a deletion of tracked work and correctly stopped to ask.
 *
 * A directory that is already in the file tree is a stronger instruction than a
 * sentence about one that is not.
 *
 * @param projectDir - The project root (the directory holding `app/` and `api/`).
 */
export async function ensureScratchDir(projectDir: string): Promise<void> {
  const scratchDir = join(projectDir, '.mol-scratch')
  const readme = join(scratchDir, 'README.md')
  if (existsSync(readme)) return
  await mkdir(scratchDir, { recursive: true })
  await writeFile(readme, SCRATCH_README)
}

// ---------------------------------------------------------------------------
// Preview navigation bridge (PV2 URL bar + PV3 Back/Forward) — BIDIRECTIONAL
//
// The IDE preview's URL bar and Back/Forward buttons talk to the running preview
// over `postMessage` in BOTH directions, and this is the in-iframe end of that
// protocol:
//
//   preview → host  `{ type: 'molecule:navigate', url }`
//     The sender. Fires on first load and every client-side route change so the
//     host `IframePreviewProvider.recordNavigation` keeps the URL bar live (PV2)
//     and builds the Back/Forward history (PV3). The host validates + dedupes.
//     The receiver lives in `@molecule/app-ide-react`'s PreviewPanel.
//
//   host → preview  `{ type: 'molecule:nav-command', action: 'back' | 'forward' }`
//     The receiver. Lets the IDE's Back/Forward buttons drive the iframe's OWN
//     history (a real client-side `history.back()`/`forward()` that preserves
//     scroll position + SPA state) instead of cold-reloading the whole preview
//     (PV3). The resulting `popstate` re-fires the sender, so the URL bar follows.
//
// The host receiver + provider shipped, but nothing in the preview ever SENT the
// `molecule:navigate` message NOR LISTENED for a nav-command — so the URL bar
// never updated on client-side nav, Back/Forward stayed disabled, and even once
// wired the only way to go Back was a cold reload. This is both ends of that fix.
//
// It is injected at scaffold time (not baked into each template) so it reaches
// EVERY app from one place — custom builds via createAppProject AND all flagship
// templates via copyTemplateInstance (which copy a static index.html that
// predates this protocol) — rather than sweeping N static template files by hand.
// ---------------------------------------------------------------------------

/**
 * The bidirectional preview-navigation `<script>` injected into every scaffolded
 * app's HTML entry. It both SENDS and RECEIVES over `postMessage`:
 *
 * - **Sends** `{ type: 'molecule:navigate', url: location.href, isReplace }` to
 *   the parent on first load and on every client-side route change —
 *   `history.pushState`/`replaceState` (patched, since they fire no event),
 *   `popstate`, and `hashchange` — covering every SPA router (React Router, Vue
 *   Router, SvelteKit, Solid Router, …). `isReplace` is `true` only for
 *   `replaceState` (a redirect/canonicalization that swaps the current history
 *   entry) so the host preserves the Forward stack instead of truncating it; it
 *   is `false` for pushState/popstate/hashchange (history-adding moves). The host
 *   validates + dedupes the reported URL.
 * - **Receives** `{ type: 'molecule:nav-command', action: 'back' | 'forward' }`
 *   from the embedding host and runs `history.back()`/`history.forward()` in the
 *   iframe — a true client-side Back/Forward (keeps scroll + SPA state). Only the
 *   embedding parent (`event.source === window.parent`) may steer navigation.
 *
 * No-op outside the IDE iframe (a production build runs standalone, so
 * `window.parent === window` and the IIFE returns before patching or listening).
 */
const PREVIEW_NAV_BRIDGE_SCRIPT = `    <!-- mol:nav-bridge -->
    <script>
      // molecule:navigate    — report client-side navigations to the parent IDE so the
      //                         URL bar shows the live URL (PV2) + Back/Forward work (PV3).
      // molecule:nav-command — receive Back/Forward from the host and drive the iframe's
      //                         OWN history (real client-side nav, not a cold reload, PV3).
      // The host (IframePreviewProvider) validates + dedupes the reported URL.
      // No-op outside the IDE iframe (production runs standalone).
      (function () {
        if (!window.parent || window.parent === window) return;
        // isReplace tells the host whether the nav REPLACED the current history
        // entry (replaceState — a redirect/canonicalization) or ADDED one
        // (pushState/popstate/hashchange). The host preserves the Forward stack on
        // a replace and truncates it only on a push, so a replaceState-redirect-on-
        // load (e.g. an auth guard) no longer kills Forward.
        function report(isReplace) {
          try {
            window.parent.postMessage({ type: 'molecule:navigate', url: location.href, isReplace: !!isReplace }, '*');
          } catch (_e) {
            // Parent gone / cross-origin restriction — nothing to report; safe to ignore.
          }
        }
        // SPA routers navigate via history.pushState/replaceState, which fire no
        // event — patch them to report after the URL has actually changed.
        // pushState ADDS an entry (report as push); replaceState SWAPS the current
        // one (report as replace so the host keeps the Forward stack).
        var origPush = history.pushState;
        var origReplace = history.replaceState;
        history.pushState = function () {
          var result = origPush.apply(this, arguments);
          report(false);
          return result;
        };
        history.replaceState = function () {
          var result = origReplace.apply(this, arguments);
          report(true);
          return result;
        };
        // Back/forward navigation and hash-based routing fire these — history-adding
        // moves (the host dedupes the Back/Forward it drove), so report as non-replace.
        window.addEventListener('popstate', function () { report(false); });
        window.addEventListener('hashchange', function () { report(false); });
        // Receive Back/Forward nav-commands from the host IDE and drive the iframe's
        // OWN history — a real client-side Back/Forward (preserves scroll + SPA state),
        // not a host-side cold reload. The host posts these to iframe.contentWindow;
        // the resulting popstate re-fires report() so the URL bar follows along. Only
        // the embedding parent may steer navigation (reject any other window's posts).
        window.addEventListener('message', function (event) {
          if (event.source !== window.parent) return;
          var data = event.data;
          if (!data || data.type !== 'molecule:nav-command') return;
          if (data.action === 'back') {
            history.back();
          } else if (data.action === 'forward') {
            history.forward();
          }
        });
        // A plain click on a same-origin link is reported BEFORE the browser leaves:
        // a raw document (feed.xml, provenance.json, llms.txt) carries no bridge, so
        // it can never report itself, and without this the host took the silence for
        // a blank app and covered a perfectly good page with the reload notice.
        // 'isIntent' says the document is on its way; the host decides from the URL.
        document.addEventListener('click', function (event) {
          if (event.defaultPrevented || event.button !== 0) return;
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          var el = event.target;
          while (el && el.nodeType === 1 && el.tagName !== 'A') el = el.parentNode;
          if (!el || el.tagName !== 'A' || !el.getAttribute('href')) return;
          if (el.hasAttribute('download')) return;
          var target = (el.getAttribute('target') || '').toLowerCase();
          if (target && target !== '_self') return;
          var url;
          try { url = new URL(el.getAttribute('href'), location.href); } catch (_e) { return; }
          if (url.origin !== location.origin) return;
          if (url.pathname === location.pathname && url.search === location.search && url.hash) return;
          try {
            window.parent.postMessage({ type: 'molecule:navigate', url: url.href, isReplace: false, isIntent: true }, '*');
          } catch (_e) {
            // Parent gone — nothing to report.
          }
        }, true);
        // Report the initial location once so the URL bar is correct on first paint.
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', function () { report(false); });
        } else {
          report(false);
        }
      })();
    </script>
`

// ---------------------------------------------------------------------------
// The preview bridges are FILES the entry document references, not code inlined
// into it.
//
// WHY: the five bridges are ~59 KB of platform plumbing (liveness 13 KB, nav 5 KB,
// snapshot 10 KB, runtime 5 KB, interact 26 KB), and writing them into
// `app/index.html` made the entry document of a DEFAULT scaffold 63 KB — a
// document the executor reads as soon as it looks at the app shell, and one it
// must never edit (the scripts belong to the platform). X0 flash-m77 lost ~3
// minutes of its plan phase to it: the 63 KB read (plus the 175 KB suite read
// before it) took the transcript to ~446 K chars (≈111 K tokens) against a 120 K
// context cap, the trim cut the oldest reads down to summaries, and the model
// read the whole e2e suite again — twice (findings, +01:23 and +02:56).
//
// A bridge written to `<publicDir>/__mol/bridges/<name>.js` and referenced by one
// `<script src>` keeps the entry document at ~6 KB while the browser loads the
// same script, at the same point in the document, before the app's own module —
// a classic blocking `<script src>` executes in document order exactly as the
// inline `<script>` it replaces did. No behaviour changes; only where the bytes
// live.
//
// `publicDir` is Vite's static directory: the files are served at the app root in
// `vite dev` and `vite preview` with no plugin involvement. Production stays
// bridge-free: the strip plugin removes the referencing tags on `vite build` AND
// deletes the now-unreferenced files from the build output (see
// templates/app/shared/vite-preview-bridge-plugin.ts.tpl).
//
// The bridge LITERALS stay whole (sentinel comment + `<script>` tags + body): the
// sentinel is what keeps the injectors idempotent, and molecule-dev keeps
// byte-identical copies of some of them behind a drift guard. Only the body
// between the tags is written to the file.
// ---------------------------------------------------------------------------

/** Directory under the app's Vite `publicDir` holding the bridge scripts. */
const PREVIEW_BRIDGE_ASSET_DIR = '__mol/bridges'

/** URL prefix those files are served under (no trailing slash). */
const PREVIEW_BRIDGE_ASSET_URL = '/__mol/bridges'

/**
 * The JavaScript a bridge script literal actually executes — everything between
 * its opening `<script>` and its closing `</script>`.
 *
 * @param literal - The bridge literal (sentinel comment + script tags + body).
 * @returns The executable body, or the literal unchanged when it holds no tag.
 */
function bridgeScriptBody(literal: string): string {
  return /<script[^>]*>([\s\S]*)<\/script>/.exec(literal)?.[1] ?? literal
}

/**
 * The directory a scaffolded entry document's bridge files belong in.
 *
 * The app's Vite static directory is `public` for every framework in the
 * registry except SvelteKit, whose entry document also lives elsewhere
 * (`src/app.html`). A caller that already resolved the framework's `publicDir`
 * passes it; otherwise the directory the app already has is used, so the files
 * land beside the app's other static assets rather than in a new tree.
 *
 * `publicDir` IS A PATH, and it MUST be absolute. The registry states the same
 * field as a NAME (`schema.ts`: "Static assets directory name"), so a caller
 * holding `fwConfig.publicDir` has to resolve it against its own project root
 * first — `createAppProject` passes `join(projectPath, publicDir)`. Passing the
 * bare name joined a relative path that `writeFile` resolved against the
 * PROCESS CWD, so every custom build wrote its five bridge scripts into
 * `<cwd>/public/__mol/bridges/` while its `index.html` referenced them at
 * `/__mol/bridges/` — the document loaded scripts the app never had. X0
 * flash-m86 (+19:50) paid 24 s for that: its dev server 404'd
 * `preview-bridge.js` and `interact-bridge.js` (the two molecule-dev does not
 * re-inject at the edge), `screenshot_preview` reported the 404s as the app's
 * own errors, and the platform's liveness + interact bridges were dead for that
 * project for the life of the sandbox. The guard below makes that loud rather
 * than silent: a relative dir is a caller bug, and a scaffold that fails beats a
 * sandbox whose preview is quietly broken.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @param publicDir - The framework's configured static dir, ABSOLUTE, when the caller knows it.
 * @returns The absolute directory for the bridge scripts.
 * @throws {Error} When `publicDir` is a relative path (a bare directory name).
 */
function previewBridgeAssetDir(htmlPath: string, publicDir?: string): string {
  if (publicDir) {
    if (!isAbsolute(publicDir))
      throw new Error(
        `previewBridgeAssetDir: publicDir must be an absolute path, got "${publicDir}" — the ` +
          'registry states it as a directory NAME, so the caller resolves it (join(projectPath, ' +
          'publicDir)) before passing it here; a relative path would write the bridge scripts ' +
          'into the process cwd instead of the app.',
      )
    return join(publicDir, PREVIEW_BRIDGE_ASSET_DIR)
  }
  const appDir = dirname(htmlPath)
  for (const name of ['public', 'static']) {
    const candidate = join(appDir, name)
    if (existsSync(candidate)) return join(candidate, PREVIEW_BRIDGE_ASSET_DIR)
  }
  return join(appDir, 'public', PREVIEW_BRIDGE_ASSET_DIR)
}

/**
 * Write a bridge's script to its file and return the two-line reference that
 * loads it, sentinel comment first.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @param publicDir - The framework's configured public dir, when the caller knows it.
 * @param name - The bridge's sentinel name (`nav-bridge`, `interact-bridge`, …).
 * @param literal - The bridge literal whose `<script>` body is the file's content.
 * @returns The reference markup to insert into the entry document.
 */
async function writePreviewBridgeAsset(
  htmlPath: string,
  publicDir: string | undefined,
  name: string,
  literal: string,
): Promise<string> {
  const dir = previewBridgeAssetDir(htmlPath, publicDir)
  await mkdir(dir, { recursive: true })
  await writeGuarded(join(dir, `${name}.js`), bridgeScriptBody(literal))
  return bridgeReference(name)
}

/**
 * The two lines a scaffolded document carries in place of a bridge: the sentinel
 * comment the injectors key on, then the one tag that loads the script.
 *
 * @param name - The bridge's sentinel name (`nav-bridge`, `interact-bridge`, …).
 * @returns The reference markup.
 */
function bridgeReference(name: string): string {
  return (
    `    <!-- mol:${name} -->\n` +
    `    <script src="${PREVIEW_BRIDGE_ASSET_URL}/${name}.js"></script>\n`
  )
}

/**
 * The OLD form of a bridge — sentinel comment plus the inline `<script>` (no
 * `src`) that was inlined into the document until this split.
 *
 * A template whose scaffold predates the split carries this, and so does a
 * project scaffolded by an older mlcl; both are moved out rather than left in
 * place, so the entry document of any scaffold this runs over ends up small.
 *
 * @param name - The bridge's sentinel name.
 * @returns The regex matching the inline block, sentinel through `</script>`.
 */
function inlineBridgeBlock(name: string): RegExp {
  return new RegExp(
    `[ \\t]*<!--\\s*mol:${name}\\s*-->\\s*<script(?![^>]*\\bsrc=)[^>]*>[\\s\\S]*?</script>[ \\t]*\\n?`,
  )
}

/**
 * Make a scaffolded HTML entry file REFERENCE a bridge instead of carrying it:
 * write the bridge to its file, then either move an inline copy out or insert the
 * reference before `</body>`.
 *
 * Idempotency is keyed on the bridge's sentinel name (`mol:nav-bridge`) as
 * before, but "already there" now means "already a reference": an inline copy is
 * not skipped, it is moved. The file always gets the scaffold's CURRENT literal
 * for that bridge (never the copy found in the document), so a project scaffolded
 * by an older version picks up the current one.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @param publicDir - The framework's configured public dir, when the caller knows it.
 * @param name - The bridge's sentinel name (`nav-bridge`, `interact-bridge`, …).
 * @param literal - The bridge literal whose body becomes the referenced file.
 * @returns Whether the document was rewritten.
 */
async function injectPreviewBridge(
  htmlPath: string,
  publicDir: string | undefined,
  name: string,
  literal: string,
): Promise<boolean> {
  if (!existsSync(htmlPath)) return false
  const html = await readFile(htmlPath, 'utf-8')
  const reference = bridgeReference(name)
  const inline = inlineBridgeBlock(name).exec(html)
  if (inline) {
    await writePreviewBridgeAsset(htmlPath, publicDir, name, literal)
    await writeGuarded(
      htmlPath,
      html.slice(0, inline.index) + reference + html.slice(inline.index + inline[0].length),
    )
    return true
  }
  // Already a reference to the bridge's file — nothing to do.
  if (html.includes(`mol:${name}`)) return false
  const closingBodyIndex = html.lastIndexOf('</body>')
  if (closingBodyIndex === -1) {
    // No </body> to anchor against — not a document we can safely augment.
    mlclDebug(`[scaffold] injectPreview${name}: no </body> in ${htmlPath}; skipped`)
    return false
  }
  await writePreviewBridgeAsset(htmlPath, publicDir, name, literal)
  const next = html.slice(0, closingBodyIndex) + reference + html.slice(closingBodyIndex)
  // A read-modify-write of the entry document that already exists: guarded,
  // so a failed write restores its bytes instead of truncating index.html.
  await writeGuarded(htmlPath, next)
  return true
}

/**
 * Idempotently insert {@link PREVIEW_NAV_BRIDGE_SCRIPT} into a scaffolded HTML
 * entry file (`index.html`, or SvelteKit's `src/app.html`) so the running preview
 * reports its client-side navigations to the IDE (PV2 URL bar) AND obeys the
 * host's Back/Forward nav-commands via its own history (PV3 — no cold reload).
 *
 * Called from BOTH scaffold paths so the sender reaches every app from one place:
 * `copyTemplateInstance` (the flagship templates ship a static index.html that
 * predates this protocol) and `createAppProject` (custom builds written from
 * `index.html.tpl`). The reference is inserted immediately before the closing
 * `</body>`; it is a no-op when already present (a re-run, or a document that
 * still carries the older inline copy) or when the file is missing / has no
 * `</body>`.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @param publicDir - The app's configured static dir, when the caller knows it.
 * @returns Whether the reference was inserted.
 */
export async function injectPreviewNavBridge(
  htmlPath: string,
  publicDir?: string,
): Promise<boolean> {
  // Idempotency keyed on the injected sentinel, NOT the substring "molecule:navigate"
  // (which also appears in the index.html.tpl prose comment that points here).
  return injectPreviewBridge(htmlPath, publicDir, 'nav-bridge', PREVIEW_NAV_BRIDGE_SCRIPT)
}

// ---------------------------------------------------------------------------
// PV-SNAPSHOT + PV-LIVENESS — the second injected preview `<script>`.
//
// One injected script serves two preview concerns the baked per-template sender
// can't cover on its own, both delivered from this ONE place so they reach all
// flagship templates AND custom builds without sweeping N hand-curated
// index.html files (the same single-source rule as injectPreviewNavBridge):
//
//   • P2-16 (snapshot): rasterize the last STABLE render to a small downscaled
//     JPEG and post `{ type: 'molecule:snapshot', dataUrl }` to the parent IDE so
//     it can show a blurred "last working build" placeholder while the app is
//     blank/rebuilding during a Synthase edit. The parent CANNOT do this itself —
//     the preview is cross-origin (127.0.0.1:{port} vs the IDE's localhost) so any
//     parent-side canvas read of the iframe is tainted; the only viable path is a
//     cooperative SAME-ORIGIN self-rasterize inside the sandbox app (SVG
//     <foreignObject> → Image → offscreen canvas → toDataURL), dependency-free.
//
//   • P2-15 (self-healing readiness): the IDE loading overlay clears ONLY on the
//     `molecule:ready` postMessage. The baked sender posts ready once and SUPPRESSES
//     it under a rapid ready/error storm — a dropped/suppressed ready leaves the
//     overlay stuck forever. This bridge is an INDEPENDENT closure (NOT subject to
//     the baked sender's suppression flag), so it re-sends `molecule:ready` on first
//     render AND on a periodic "rendered+alive" beat while #root has content,
//     healing any missed handshake. The parent treats ready idempotently, so a
//     double-ready is harmless. The baked sender still fires the initial ready; this
//     ADDS the resilient re-send + beat and — by being injected here — gets the SAME
//     re-injection treatment as the nav bridge (so it survives cache/pool boots once
//     molecule-dev/api mirrors it).
//
// No-op outside the IDE iframe (production runs standalone → window.parent ===
// window → the IIFE returns before observing or posting anything).
// ---------------------------------------------------------------------------

/**
 * The combined snapshot + self-healing-readiness `<script>` injected into every
 * scaffolded app's HTML entry, immediately before `</body>`. See the block
 * comment above for the two concerns it serves (P2-16 snapshot + P2-15 ready
 * self-heal). Mirrors {@link PREVIEW_NAV_BRIDGE_SCRIPT}'s shape: a single inline
 * IIFE, guarded on the IDE-iframe check, dependency-free, every operation wrapped
 * in try/catch with graceful degradation (a tainted canvas just skips the frame).
 *
 * IMPORTANT for the molecule-dev/api cache/pool re-injection agent: this exact
 * text must be mirrored BYTE-FOR-BYTE wherever the bridge is re-injected on
 * cache-hit / pooled boots (same constraint as the nav bridge), or the handshake
 * + snapshot drift between boot tiers.
 */
const PREVIEW_SNAPSHOT_BRIDGE_SCRIPT = `    <!-- mol:snapshot-bridge -->
    <script>
      // molecule:snapshot — post a small downscaled JPEG of the last STABLE render so
      //   the parent IDE can show a blurred "last working build" frame while the app
      //   is blank/rebuilding (P2-16). Self-rasterized SAME-ORIGIN (the cross-origin
      //   parent cannot canvas-capture the iframe), dependency-free, time-budgeted.
      // molecule:ready (self-heal) — the loading overlay clears ONLY on molecule:ready;
      //   the baked sender posts it once and suppresses it under a rapid ready/error
      //   storm, so a dropped/suppressed ready leaves the overlay stuck forever (P2-15).
      //   This is an INDEPENDENT closure (not subject to that suppression), so it
      //   re-sends ready on first render and on a periodic "rendered+alive" beat while
      //   #root has content. The parent treats ready idempotently (double-ready is safe).
      // No-op outside the IDE iframe (production runs standalone).
      (function () {
        if (!window.parent || window.parent === window) return;
        // Resolve the app's render root LAZILY on every check: this script may run
        // (injected in <head>) before the content exists, and imported / SSR apps
        // often render straight into <body> with no #root/#app wrapper. Falling back
        // to <body> — instead of capturing #root once and bailing when it is absent —
        // is what lets molecule:ready fire for those apps (otherwise the IDE loading
        // overlay sticks forever).
        function molRoot() {
          return document.getElementById('root') || document.getElementById('app') || document.body || null;
        }
        function isChrome(el) {
          return /^(SCRIPT|STYLE|LINK|META|TEMPLATE|BASE|TITLE|NOSCRIPT)$/.test(el.tagName);
        }
        function rootHasVisibleContent() {
          try {
            var root = molRoot();
            if (!root) return false;
            if (root !== document.body) {
              return root.children.length > 0 && root.getBoundingClientRect().height > 10;
            }
            // Body fallback: require a NON-chrome child (not the injected bridge
            // <script>s / <style> / <meta>) with real rendered height, so the bridge
            // tags alone never count as "the app rendered".
            for (var i = 0; i < root.children.length; i++) {
              var el = root.children[i];
              if (isChrome(el)) continue;
              try {
                if (el.getBoundingClientRect().height > 10) return true;
              } catch (_inner) {
                // element measurement failed — keep scanning siblings.
              }
            }
            return false;
          } catch (_e) {
            return false;
          }
        }
        function postReady() {
          try {
            window.parent.postMessage({ type: 'molecule:ready' }, '*');
          } catch (_e) {
            // Parent gone / cross-origin restriction — safe to ignore.
          }
        }

        // --- Self-healing readiness (P2-15) ---
        // Re-send ready the instant a render first appears (fast overlay clear), and
        // beat ready every few seconds while content is present so a ready that the
        // baked sender dropped/suppressed self-heals and the overlay can't stick.
        var hasContent = false;
        function healReadiness() {
          var visible = rootHasVisibleContent();
          if (visible && !hasContent) {
            hasContent = true;
            postReady();
          } else if (!visible && hasContent) {
            hasContent = false;
          }
        }
        if (rootHasVisibleContent()) {
          hasContent = true;
          postReady();
        }
        setInterval(function () {
          if (rootHasVisibleContent()) postReady();
        }, 4000);

        // --- Last-good-frame snapshot (P2-16) ---
        var SNAPSHOT_MIN_INTERVAL = 4000; // throttle: at most one capture per 4s
        var SNAPSHOT_DEBOUNCE = 700;      // settle: capture 700ms after the last mutation
        var SNAPSHOT_MAX_WIDTH = 600;     // downscale target width (keeps the payload small)
        var SNAPSHOT_MAX_HEIGHT = 1200;   // cap source height for very long pages
        var lastCapture = 0;
        var capturing = false;
        var debounceTimer = null;

        function bgColor() {
          // JPEG has no alpha, so the canvas needs an opaque fill or transparent
          // areas encode as black. Use the app's own background where readable.
          try {
            var c = getComputedStyle(document.body).backgroundColor;
            if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') return c;
          } catch (_e) {
            // getComputedStyle unavailable — fall through to the default.
          }
          return '#ffffff';
        }
        function collectSameOriginCss() {
          // An SVG <foreignObject> loaded via <img> renders in an ISOLATED context:
          // the document's <link>/<style> rules do NOT apply, so without this the
          // raster would be unstyled and useless as a placeholder. Embed same-origin
          // stylesheet text as one <style>. Cross-origin sheets (e.g. Google Fonts)
          // throw on cssRules access — skip them (fonts may then substitute, which is
          // acceptable for a blurred placeholder).
          var css = '';
          try {
            for (var i = 0; i < document.styleSheets.length; i++) {
              try {
                var rules = document.styleSheets[i].cssRules;
                if (!rules) continue;
                for (var j = 0; j < rules.length; j++) css += rules[j].cssText;
              } catch (_e) {
                // Cross-origin stylesheet — not readable; skip it.
              }
            }
          } catch (_e) {
            // styleSheets unavailable — capture without embedded CSS.
          }
          return css;
        }
        function capture() {
          if (capturing) return;
          if (Date.now() - lastCapture < SNAPSHOT_MIN_INTERVAL) return;
          if (!rootHasVisibleContent()) return;
          var root = molRoot();
          if (!root) return;
          try {
            capturing = true;
            lastCapture = Date.now();
            var rect = root.getBoundingClientRect();
            var srcW = Math.max(1, Math.round(rect.width));
            var srcH = Math.max(1, Math.min(Math.round(rect.height), SNAPSHOT_MAX_HEIGHT));
            var scale = Math.min(1, SNAPSHOT_MAX_WIDTH / srcW);
            var dstW = Math.max(1, Math.round(srcW * scale));
            var dstH = Math.max(1, Math.round(srcH * scale));
            // Clone so adding the XHTML namespace + serializing never mutates the
            // live node (which would retrigger the MutationObserver below).
            var clone = root.cloneNode(true);
            clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
            var serialized = new XMLSerializer().serializeToString(clone);
            var css = collectSameOriginCss();
            var svg =
              '<svg xmlns="http://www.w3.org/2000/svg" width="' + srcW + '" height="' + srcH + '">' +
              '<foreignObject x="0" y="0" width="100%" height="100%">' +
              (css ? '<style>' + css + '</style>' : '') +
              serialized +
              '</foreignObject></svg>';
            var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            var img = new Image();
            var done = false;
            // Time budget: if the SVG never loads, release the lock so future
            // captures aren't blocked forever.
            var safety = setTimeout(function () {
              if (!done) {
                done = true;
                capturing = false;
              }
            }, 3000);
            img.onload = function () {
              if (done) return;
              done = true;
              clearTimeout(safety);
              try {
                var canvas = document.createElement('canvas');
                canvas.width = dstW;
                canvas.height = dstH;
                var ctx = canvas.getContext('2d');
                ctx.fillStyle = bgColor();
                ctx.fillRect(0, 0, dstW, dstH);
                ctx.drawImage(img, 0, 0, srcW, srcH, 0, 0, dstW, dstH);
                // toDataURL THROWS on a tainted canvas (the app drew a cross-origin
                // image) — swallow + skip = graceful degradation to today's blank.
                var dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                window.parent.postMessage({ type: 'molecule:snapshot', dataUrl: dataUrl }, '*');
              } catch (_e) {
                // Tainted canvas or encode failure — skip this frame silently.
              } finally {
                capturing = false;
              }
            };
            img.onerror = function () {
              if (done) return;
              done = true;
              clearTimeout(safety);
              capturing = false;
            };
            img.src = url;
          } catch (_e) {
            capturing = false;
          }
        }
        function scheduleCapture() {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(capture, SNAPSHOT_DEBOUNCE);
        }

        // One observer drives BOTH halves: heal readiness immediately on a content
        // transition, and (cheaply) debounce a snapshot after the DOM settles. The
        // callback is coalesced into a single rAF (like the baked sender) so the
        // per-mutation work stays trivial; the heavy capture runs only in the
        // throttled, debounced capture() — never synchronously per mutation.
        var pending = false;
        new MutationObserver(function () {
          if (pending) return;
          pending = true;
          requestAnimationFrame(function () {
            pending = false;
            healReadiness();
            scheduleCapture();
          });
        }).observe(molRoot() || document.documentElement, { childList: true, subtree: true });
        // Capture the initial render too (the app may already be painted here).
        if (rootHasVisibleContent()) scheduleCapture();
      })();
    </script>
`

/**
 * Idempotently insert {@link PREVIEW_SNAPSHOT_BRIDGE_SCRIPT} into a scaffolded
 * HTML entry file (`index.html`, or SvelteKit's `src/app.html`), immediately
 * before the closing `</body>`. Modeled exactly on {@link injectPreviewNavBridge}:
 * idempotent (keyed on the `mol:snapshot-bridge` sentinel comment), a no-op when
 * the file is missing / already has the bridge / has no `</body>`.
 *
 * Called from BOTH scaffold paths (right after `injectPreviewNavBridge`) so the
 * bridge reaches every app from one place: `copyTemplateInstance` (the flagship
 * templates) and `createAppProject` (custom builds). Adds the P2-16 last-good-frame
 * snapshot sender + the P2-15 self-healing `molecule:ready` re-send/beat.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @returns Whether the bridge was inserted.
 */
export async function injectPreviewSnapshotBridge(
  htmlPath: string,
  publicDir?: string,
): Promise<boolean> {
  // Idempotency keyed on the injected sentinel, NOT the substring "molecule:snapshot"
  // (which may also appear in prose comments that point here).
  return injectPreviewBridge(htmlPath, publicDir, 'snapshot-bridge', PREVIEW_SNAPSHOT_BRIDGE_SCRIPT)
}

// ---------------------------------------------------------------------------
// PV-RUNTIME — the third injected preview `<script>`: runtime-FAILURE detection.
//
// The baked per-template sender (in the flagship index.html files) captures
// runtime errors + posts a heartbeat — but a CUSTOM build (no template) has NO
// baked sender, so without this it has ZERO runtime-failure detection: a frozen,
// blank, or throwing custom app would never reach the IDE or Synthase. Delivered
// from this ONE place (the same single-source rule as the nav + snapshot bridges)
// so it reaches custom builds AND every template AND every FUTURE app — never by
// hand-baking N index.html files.
//
// Three signals the IDE turns into an auto-fix:
//   • molecule:heartbeat  — a liveness beat from a setInterval on the app's OWN
//     thread; if that thread locks up (an infinite render loop), the beats STOP and
//     the parent's freeze watchdog surfaces + reports the freeze. A frozen app
//     cannot self-report anything else, so the ABSENCE of the beat is the signal.
//   • molecule:runtime-error — uncaught errors + unhandled rejections forwarded so
//     Synthase can auto-fix them.
//   • molecule:blank — the document loaded but #root rendered NO children after a
//     settle window (a route component that renders nothing). The baked sender bails
//     on 0 children, so this is the only signal for a TRULY blank app.
//
// Coexists safely with the baked sender where present: heartbeat is idempotent (any
// beat resets the watchdog) and the IDE de-dupes runtime errors by signature, so the
// double-post in templates is harmless. No-op outside the IDE iframe (production runs
// standalone → window.parent === window → the IIFE returns before posting anything).
// ---------------------------------------------------------------------------

/**
 * The runtime-failure-detection `<script>` injected into every scaffolded app's
 * HTML entry, immediately before `</body>`. See the block comment above for the
 * three signals it sends (heartbeat / runtime-error / blank). Mirrors
 * {@link PREVIEW_SNAPSHOT_BRIDGE_SCRIPT}'s shape: a single inline IIFE, guarded on
 * the IDE-iframe check, dependency-free, every post wrapped in try/catch.
 *
 * IMPORTANT for the molecule-dev/api cache/pool re-injection agent: this exact text
 * must be mirrored BYTE-FOR-BYTE wherever the bridge is re-injected on cache-hit /
 * pooled boots (same constraint as the nav + snapshot bridges), or the runtime
 * detection drifts between boot tiers. A drift-guard test enforces this.
 */
const PREVIEW_RUNTIME_BRIDGE_SCRIPT = `    <!-- mol:runtime-bridge -->
    <script>
      // Runtime-failure detection (heartbeat / runtime-error / blank), delivered from
      // ONE place so custom builds + every template + every future app have it (the
      // baked per-template sender does not exist for custom apps). No-op outside the IDE
      // iframe (production runs standalone → window.parent === window).
      (function () {
        if (!window.parent || window.parent === window) return;
        function post(type, data) {
          try {
            var msg = { type: type };
            if (data) for (var k in data) if (data[k] !== undefined) msg[k] = data[k];
            window.parent.postMessage(msg, '*');
          } catch (_e) {
            // Parent gone / cross-origin restriction — safe to ignore.
          }
        }
        // Liveness beat — a setInterval on the app's OWN thread. If that thread locks
        // up (an infinite render loop), the beats STOP; the parent's freeze watchdog
        // notices the silence (a frozen app can't post anything else).
        setInterval(function () { post('molecule:heartbeat'); }, 3000);
        // Forward uncaught errors + unhandled rejections so the IDE can hand them to
        // Synthase for an auto-fix. De-duped at the IDE by signature, so a double with
        // a template's baked sender is harmless.
        // A failed dynamic app-module import means this page's JS may no longer run
        // (typically stale module URLs on a page that outlived a dev-server bounce):
        // the DOM stays visible but clicks do nothing. Flag it on window so the
        // interact bridge marks its ui-result replies pageDead (see reply()).
        function noteDeadPage(text) {
          try {
            if (/failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|ChunkLoadError/i.test(String(text || ''))) {
              window.__molPageDead = String(text).slice(0, 200);
            }
          } catch (_e) {}
        }
        window.addEventListener('error', function (e) {
          noteDeadPage(e && e.message);
          post('molecule:runtime-error', {
            message: String((e && e.message) || 'Runtime error'),
            source: (e && e.filename) || undefined,
            line: (e && e.lineno) || undefined,
            column: (e && e.colno) || undefined
          });
        });
        window.addEventListener('unhandledrejection', function (e) {
          var r = e && e.reason;
          noteDeadPage((r && (r.stack || r.message)) || r);
          post('molecule:runtime-error', {
            message: String((r && r.message) || r || 'Unhandled promise rejection'),
            source: 'unhandledrejection'
          });
        });
        // Empty-render detection: the document finished loading but the app rendered
        // NOTHING into #root after a settle window (a route component returning null or
        // never resolving). The baked sender bails on 0 children, so this is the only
        // signal for a truly blank app. A real render that lands later posts
        // molecule:ready, which the parent treats as authoritative over this.
        function checkEmptyRender() {
          try {
            var root = document.getElementById('root') || document.getElementById('app');
            if (root) {
              if (root.children.length === 0) {
                post('molecule:blank', {
                  message: 'The page loaded but rendered no content (#root is empty after settling) — the route component renders nothing.'
                });
              }
              return;
            }
            // No #root/#app: an imported / SSR app that renders straight into <body>.
            // Report blank only if <body> has NO non-chrome child (script/style/meta) —
            // a truly empty render — so the injected bridge <script>s never mask it.
            var body = document.body;
            if (!body) return;
            for (var i = 0; i < body.children.length; i++) {
              if (!/^(SCRIPT|STYLE|LINK|META|TEMPLATE|BASE|TITLE|NOSCRIPT)$/.test(body.children[i].tagName)) return;
            }
            post('molecule:blank', {
              message: 'The page loaded but rendered no content after settling — the app rendered nothing.'
            });
          } catch (_e) {
            // No root / DOM unavailable — nothing to report.
          }
        }
        if (document.readyState === 'complete') {
          setTimeout(checkEmptyRender, 4000);
        } else {
          window.addEventListener('load', function () { setTimeout(checkEmptyRender, 4000); });
        }
      })();
    </script>
`

/**
 * Idempotently insert {@link PREVIEW_RUNTIME_BRIDGE_SCRIPT} into a scaffolded HTML
 * entry file (`index.html`, or SvelteKit's `src/app.html`), immediately before the
 * closing `</body>`. Modeled exactly on {@link injectPreviewSnapshotBridge}:
 * idempotent (keyed on the `mol:runtime-bridge` sentinel comment), a no-op when the
 * file is missing / already has the bridge / has no `</body>`.
 *
 * Called from BOTH scaffold paths (right after `injectPreviewSnapshotBridge`) so the
 * runtime-failure detection reaches every app from one place: `copyTemplateInstance`
 * (the flagship templates) and `createAppProject` (custom builds — which have NO
 * baked sender and thus depend on this for any runtime detection at all).
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @returns Whether the bridge was inserted.
 */
export async function injectPreviewRuntimeBridge(
  htmlPath: string,
  publicDir?: string,
): Promise<boolean> {
  // Idempotency keyed on the injected sentinel.
  return injectPreviewBridge(htmlPath, publicDir, 'runtime-bridge', PREVIEW_RUNTIME_BRIDGE_SCRIPT)
}

/**
 * VERBATIM MIRROR of molecule-dev's canonical `PREVIEW_INTERACT_BRIDGE_SCRIPT`
 * (`molecule-dev/api/src/sandbox/preview-proxy-asset.ts`) — the live-preview control
 * bridge that lets Synthase (the IDE's AI executor) READ the on-screen UI (interactive
 * elements by `data-mol-id`) and click/fill/select in the running preview to verify a
 * feature end-to-end in the tab the user is watching (the e2e specs have their own
 * browser — the sandbox ships Chromium — this bridge is for the user's live view and
 * for the executor's preview tools). molecule-dev injects this into IMPORTED-app
 * previews via its runtime proxy bundle; baking the SAME script into SCAFFOLDED apps
 * here is what lets Synthase drive THEIR previews too. The two copies are kept
 * byte-identical by a drift-guard test (`preview-proxy-asset.test.ts`) that reads both
 * source literals and compares them — editing one without the other fails CI.
 *
 * Same safety envelope as the other bridges: a no-op outside the IDE iframe
 * (`window.parent === window`, so a production build is inert), never part of the app's
 * behavior standalone, dependency-free.
 */
const PREVIEW_INTERACT_BRIDGE_SCRIPT = `    <!-- mol:interact-bridge -->
    <script>
      (function () {
        if (!window.parent || window.parent === window) return;
        var SEL = '[data-mol-id],button,[role="button"],a[href],input,select,textarea,' +
          '[role="link"],[role="checkbox"],[role="switch"],[role="tab"],[role="menuitem"],' +
          '[role="option"],[contenteditable="true"],' +
          // Live regions (toasts / inline errors): NOT interactive, but a rejection shown as a
          // transient toast was invisible to snapshots and the executor stalled on it.
          '[role="alert"],[role="status"],[aria-live],' +
          // Dialog containers: inner buttons showed up but nothing said "a modal is open".
          'dialog,[role="dialog"],[role="alertdialog"],[role="progressbar"]';
        var LIVE_SEL = '[role="alert"],[role="status"],[aria-live]';
        function visible(el) {
          if (!el || el.hidden) return false;
          var r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) return false;
          try {
            var s = (el.ownerDocument.defaultView || window).getComputedStyle(el);
            if (s.visibility === 'hidden' || s.display === 'none') return false;
          } catch (e) {}
          return true;
        }
        function label(el) {
          var t = (el.getAttribute && el.getAttribute('aria-label') || '').trim();
          if (t) return t.slice(0, 80);
          var lb = el.getAttribute && el.getAttribute('aria-labelledby');
          if (lb) {
            try {
              var ref = document.getElementById(lb.split(/\\s+/)[0]);
              var rt = ref ? (ref.textContent || '').replace(/\\s+/g, ' ').trim() : '';
              if (rt) return rt.slice(0, 80);
            } catch (e) {}
          }
          // Associated <label> (for= / wrapping): form inputs usually have empty text and no
          // placeholder, so fills targeted by the field's VISIBLE label name used to miss.
          try {
            if (/^(input|select|textarea)$/i.test(el.tagName)) {
              var lab = null;
              if (el.id) lab = document.querySelector('label[for="' + ((window.CSS && CSS.escape) ? CSS.escape(el.id) : el.id) + '"]');
              if (!lab && el.closest) lab = el.closest('label');
              var lt = lab ? (lab.textContent || '').replace(/\\s+/g, ' ').trim() : '';
              if (lt) return lt.slice(0, 80);
            }
          } catch (e) {}
          var txt = (el.textContent || '').replace(/\\s+/g, ' ').trim();
          var ph = (el.getAttribute && el.getAttribute('placeholder') || '').trim();
          return (txt || ph || (el.value || '')).slice(0, 80);
        }
        function describe(el) {
          var o = {
            molId: el.getAttribute ? el.getAttribute('data-mol-id') : null,
            tag: (el.tagName || '').toLowerCase(),
            role: el.getAttribute ? el.getAttribute('role') : null,
            type: el.getAttribute ? el.getAttribute('type') : null,
            name: label(el),
            value: (el.value != null ? String(el.value) : '').slice(0, 120)
          };
          if (el.checked === true || (el.getAttribute && el.getAttribute('aria-checked') === 'true')) o.checked = true;
          if (el.disabled === true || (el.getAttribute && el.getAttribute('aria-disabled') === 'true')) o.disabled = true;
          // State the executor could not previously see: open dropdowns, the active tab,
          // the current nav item, and loading regions.
          if (el.getAttribute) {
            var ex = el.getAttribute('aria-expanded');
            if (ex === 'true' || ex === 'false') o.expanded = ex === 'true';
            if (el.getAttribute('aria-selected') === 'true') o.selected = true;
            var cur = el.getAttribute('aria-current');
            if (cur && cur !== 'false') o.current = true;
            if (el.getAttribute('aria-busy') === 'true') o.busy = true;
          }
          return o;
        }
        function snapshot() {
          var out = [], els = document.querySelectorAll(SEL), CAP = 120;
          // Count ALL visible interactive elements but only include the first CAP — on a
          // dense page (a data table of N rows × edit/delete already blows past 120) the
          // rest were dropped with NO signal, so the executor saw a partial list, missed a
          // control below the fold, and concluded it was absent. Report the overflow so it
          // knows there are more (reachable by text=<name> via interact_preview / pageText).
          var visInteractive = 0;
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (!visible(el)) continue;
            var d = describe(el);
            // Empty live-region containers (a toaster's permanent mount point) are noise —
            // include live regions only when they carry an actual message.
            if (!d.name && el.matches && el.matches(LIVE_SEL) && !d.molId) continue;
            visInteractive++;
            if (out.length < CAP) out.push(d);
          }
          var interactiveShown = out.length;
          // Significant graphics (>= 48px square): a generated QR code is an img/canvas/svg,
          // which the interactive list can NEVER show — the executor was told to verify "a QR
          // is visible" with no way to observe one, concluded the feature was broken, and
          // tangented. The size floor keeps icon svgs/imgs out. Give media its OWN small
          // budget so it is never crowded out of the shared list by a dense interactive page.
          var media = document.querySelectorAll('img,canvas,svg'), mediaShown = 0;
          for (var j = 0; j < media.length && mediaShown < 12; j++) {
            var mel = media[j];
            if (!visible(mel)) continue;
            var mr = mel.getBoundingClientRect();
            if (mr.width < 48 || mr.height < 48) continue;
            var alt = (mel.getAttribute && (mel.getAttribute('alt') || mel.getAttribute('aria-label') || mel.getAttribute('title'))) || '';
            var src = mel.tagName === 'IMG' ? String(mel.currentSrc || mel.src || '') : '';
            out.push({
              tag: mel.tagName.toLowerCase(),
              role: 'image',
              name: alt,
              size: Math.round(mr.width) + 'x' + Math.round(mr.height),
              src: src ? (src.indexOf('data:') === 0 ? src.slice(0, 30) + '… (' + src.length + ' chars)' : src.slice(0, 120)) : undefined
            });
            mediaShown++;
          }
          // The page's visible TEXT (bounded): headings, instructions, inline form errors
          // (most apps render these as a plain red <p>, NOT role=alert), empty states, list
          // contents. The element list alone left the executor blind to all static text —
          // the systemic gap behind several "it cannot see what the user sees" stalls.
          var pageText = '';
          try {
            pageText = (document.body && document.body.innerText || '')
              .replace(/[\\t ]+/g, ' ')
              .replace(/\\n{2,}/g, '\\n')
              .trim()
              .slice(0, 1500);
          } catch (e) {}
          var snap = { url: location.href, title: document.title, pageText: pageText, elements: out };
          // Overflow signal: the page has this many MORE visible interactive elements than
          // the shown list — target them by text=<name> (from pageText) via interact_preview
          // rather than concluding a control is absent.
          if (visInteractive > interactiveShown) snap.moreElements = visInteractive - interactiveShown;
          return snap;
        }
        function recentNet() {
          // Failed requests captured by the log shim (imported apps) in the last 10s — attached
          // to every reply so a click that 4xx'd explains itself in the SAME tool result.
          try {
            var ring = window.__molNetErrors || [], out = [];
            for (var i = 0; i < ring.length; i++) {
              if (Date.now() - ring[i].t < 10000) out.push(ring[i].text);
            }
            return out.length ? out.slice(-3) : undefined;
          } catch (e) { return undefined; }
        }
        function recentPageErrors() {
          // Uncaught page errors captured by the log shim, with the frame they threw at and
          // the React component that was rendering. A blank snapshot with only "nothing
          // rendered" cost xr-molecule-flash-m208 three calls and a hand-written probe.
          try {
            var ring = window.__molPageErrors || [], out = [];
            for (var i = 0; i < ring.length; i++) {
              var item = ring[i];
              if (Date.now() - item.t > 60000) continue;
              out.push('page error: ' + item.text + (item.where ? ' at ' + item.where : '') + (item.component ? ' (in <' + item.component + '>)' : ''));
            }
            return out.length ? out.slice(-3) : undefined;
          } catch (e) { return undefined; }
        }
        function findByText(txt) {
          var want = String(txt).replace(/\\s+/g, ' ').trim().toLowerCase();
          if (!want) return null;
          var els = document.querySelectorAll(SEL);
          var exact = null, partial = null;
          for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (!visible(el)) continue;
            var have = label(el).toLowerCase();
            if (!have) continue;
            if (have === want) { if (!exact || exact.contains(el)) exact = el; }
            else if (have.indexOf(want) !== -1) { if (!partial || partial.contains(el)) partial = el; }
          }
          return exact || partial;
        }
        function find(cmd) {
          if (cmd.molId) {
            var esc = (window.CSS && CSS.escape) ? CSS.escape(cmd.molId) : String(cmd.molId).replace(/"/g, '\\\\"');
            var el = document.querySelector('[data-mol-id="' + esc + '"]');
            if (el) return el;
          }
          if (cmd.selector) { try { var bySel = document.querySelector(cmd.selector); if (bySel) return bySel; } catch (e) {} }
          if (cmd.text) return findByText(cmd.text);
          return null;
        }
        function missError(cmd) {
          if (cmd.selector) {
            try { document.querySelector(cmd.selector); }
            catch (e) {
              return 'invalid CSS selector: ' + cmd.selector + ' -- this runs document.querySelector, NOT Playwright: pseudo-classes like :has-text() are not supported. Target by text (the visible name from the snapshot) or by molId instead.';
            }
          }
          var tried = [];
          if (cmd.molId) tried.push('molId "' + cmd.molId + '"');
          if (cmd.selector) tried.push('selector "' + cmd.selector + '"');
          if (cmd.text) tried.push('text "' + cmd.text + '"');
          return 'element not found for ' + (tried.join(', ') || 'empty target (no molId, selector, or text given)') + ' -- pick a target from the snapshot: use text with the exact visible name, or the molId when the snapshot shows one.';
        }
        function highlight(el) {
          try {
            el.scrollIntoView({ block: 'center' });
            var prev = el.style.outline;
            el.style.outline = '3px solid #7c3aed';
            setTimeout(function () { try { el.style.outline = prev; } catch (e) {} }, 700);
          } catch (e) {}
        }
        function setNativeValue(el, val) {
          try {
            // Use the NATIVE value setter from the CORRECT element prototype so React's
            // value tracker is bypassed and onChange fires. A <select> needs
            // HTMLSelectElement.prototype — the input setter throws "Illegal invocation"
            // on it and the catch below falls back to el.value=, which React's tracker
            // swallows (no onChange) → the dropdown choice never reaches React state.
            var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
            var desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) desc.set.call(el, val); else el.value = val;
          } catch (e) { el.value = val; }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        var uiSeen = {}, uiResults = {};
        // When THIS document loaded. The script is injected in <head>, so it is the page's
        // own age — and the paint gate below is measured from it, NOT from when a command
        // arrives. That distinction is the whole difference between "wait, it is still
        // starting up" and "wait forever on a page that is simply blank": budgeted from the
        // command, every single read of a blank preview paid the full boot grace, which is
        // exactly when the executor reads it most.
        var loadedAt = Date.now();
        // DOM-quiescence signal for the settle below: route transitions, lazy route
        // chunks (dynamic import — invisible to the fetch shim), and animations mutate
        // the DOM with ZERO network pending; snapshotting mid-transition made the
        // executor conclude a click did nothing.
        var lastMutation = loadedAt;
        try {
          new MutationObserver(function () { lastMutation = Date.now(); })
            .observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
        } catch (e) {}
        // Settle budgets (ms).
        var BOOT_MS = 8000;     // how long after load an empty page still counts as "starting"
        var NET_MS = 8000;      // max wait for in-flight requests to drain
        var DOM_MS = 4000;      // max wait for DOM mutations to stop
        var QUIET_MS = 300;     // mutation-free window that counts as settled
        var FIND_MS = 3000;     // auto-wait for a target that is still mounting
        // Hard ceiling for ONE command, shared by every gate it passes through. The gates
        // used to be independent budgets that ADDED UP (paint + find + settle ≈ 32s), which
        // overran the tool's own wait — a deliberate settle then reported as "the preview is
        // not drivable", the opposite of what it was for. The server waits 30s (45s to
        // navigate), so one command must always answer well inside that.
        var TOTAL_MS = 20000;
        function molRoot() {
          return document.getElementById('root') || document.getElementById('app') || document.body || null;
        }
        // "The app drew something" — same heuristic the nav bridge uses for molecule:ready:
        // a non-body root needs children + real height; a body root needs a NON-chrome child
        // with real height, so the injected bridge tags alone never count as a render.
        function rootHasContent() {
          try {
            var root = molRoot();
            if (!root) return false;
            if (root !== document.body) return root.children.length > 0 && root.getBoundingClientRect().height > 10;
            for (var i = 0; i < root.children.length; i++) {
              var el = root.children[i];
              if (/^(SCRIPT|STYLE|LINK|META|TEMPLATE|BASE|TITLE|NOSCRIPT)$/.test(el.tagName)) continue;
              try { if (el.getBoundingClientRect().height > 10) return true; } catch (e2) {}
            }
            return false;
          } catch (e) { return false; }
        }
        function present() { return document.readyState !== 'loading' && rootHasContent(); }
        // Whether an empty page is plausibly STILL STARTING rather than simply blank. Age of
        // the document, not of the command — so the boot grace is paid once per page load,
        // not on every call for the rest of that page's life.
        function booting() { return Date.now() - loadedAt < BOOT_MS; }
        // Hidden page (the IDE tab is backgrounded / the browser minimized): browsers
        // throttle timers here -- Chrome's intensive throttling runs ONE timer tick per
        // MINUTE -- so any settle wait would overrun the tool's reply window and read as
        // 'preview not drivable'. Nothing animates in a hidden page anyway: answer
        // single-shot instead of waiting.
        function hid() { try { return document.hidden === true; } catch (e) { return false; } }
        // Run fn once the page EXISTS (parsed + something rendered) — or as soon as it is
        // clear it never will, so a broken app is REPORTED broken instead of stalling.
        function whenPresent(fn, deadline) {
          (function wait() {
            if (!present() && booting() && Date.now() < deadline && !hid()) return setTimeout(wait, 100);
            fn();
          })();
        }
        // Hold the reply until the page is SETTLED, then snapshot. Two gates, both under the
        // command's single deadline:
        //   1. present — the document parsed and the app rendered something (only worth
        //      waiting for while the page is still booting).
        //   2. quiet — no requests in flight (NET_MS) and no DOM mutation for QUIET_MS
        //      (DOM_MS).
        // When a gate is abandoned on its budget rather than satisfied, the reply says so in
        // stillSettling — a race must be DISTINGUISHABLE from a genuinely broken page, or the
        // executor "fixes" the wrong thing.
        function settleThenReply(id, extra, deadline) {
          var t0 = Date.now();
          var end = deadline || (t0 + TOTAL_MS);
          (function step() {
            var now = Date.now();
            if (now < end && !hid()) {
              if (!present() && booting()) return setTimeout(step, 100);
              var waited = now - t0;
              var busyNet = (window.__molNetPending || 0) > 0 && waited < NET_MS;
              var busyDom = now - lastMutation < QUIET_MS && waited < DOM_MS;
              if (busyNet || busyDom) return setTimeout(step, 150);
            }
            var out = { ok: true, snapshot: snapshot() };
            if (extra) { for (var k in extra) out[k] = extra[k]; }
            var why = [];
            if (document.readyState === 'loading') why.push('the document was still parsing');
            if (!rootHasContent()) why.push('the app root is EMPTY — nothing rendered' + (booting() ? ' yet' : ' (this page has been up a while, so it is blank, not still loading — check read_logs for a runtime error)'));
            if ((window.__molNetPending || 0) > 0) why.push('requests were still in flight');
            if (hid()) why.push('the page is backgrounded (browser timers are throttled), so settle waits were skipped');
            if (why.length) {
              out.stillSettling = 'Snapshot taken with the page unsettled after ' + Math.round((Date.now() - t0) / 1000) +
                's: ' + why.join('; ') + '. It may be INCOMPLETE — if the page was still loading, call ' +
                'read_preview_ui once more before concluding it is blank or a control is missing.';
            }
            reply(id, out);
          })();
        }
        function reply(id, obj) {
          obj.type = 'molecule:ui-result'; obj.id = id;
          var rn = recentNet();
          if (rn) obj.recentNetworkErrors = rn;
          // Where the page threw, if it did — the snapshot alone cannot say.
          var pe = recentPageErrors();
          if (pe) obj.pageErrors = pe;
          // Set by the log bridge when a dynamic app-module import failed on this page
          // (see noteDeadPage): the DOM below may be a non-interactive leftover shell.
          try {
            if (window.__molPageDead) {
              obj.pageDead = 'A module import failed on this page (' + window.__molPageDead + ') so its JS may no longer run: clicks/fills can silently do NOTHING. Call reload_preview, then read_preview_ui again — do not keep interacting with this snapshot.';
            }
          } catch (e) {}
          if (id) uiResults[id] = obj;
          try { window.parent.postMessage(obj, '*'); } catch (e) {}
        }
        function run(cmd) {
          var id = cmd.id;
          // ONE deadline for the whole command, shared by every gate below.
          var deadline = Date.now() + TOTAL_MS;
          // Navigation: only the document the host navigated TO may answer. The page being
          // navigated AWAY from is still in the iframe when the command arrives, and it used
          // to answer first with a pre-navigation snapshot — so the executor "verified" the
          // screen it had just left. The host stamps minLoadedAt ONLY when a new document is
          // genuinely loading, so an outgoing document just stays quiet and the host's
          // re-post reaches the new one. Deterministic: no path or timing guesswork, and a
          // redirect (an auth guard) is answered as soon as it renders instead of waiting.
          if (cmd.minLoadedAt && loadedAt < cmd.minLoadedAt) return;
          // snapshot — read_preview_ui, AND the reply the host enqueues for navigate_preview.
          // It used to answer SYNCHRONOUSLY, which is the biggest source of "the page never
          // loaded" false alarms: this script is injected in <head>, so after a navigate or
          // reload the FRESH document's bridge answers the host's re-post while the framework
          // is still booting — empty root, empty pageText, zero elements. Settle first.
          if (cmd.action === 'snapshot') return settleThenReply(id, null, deadline);
          if (cmd.action === 'waitFor') {
            var waitEnd = Math.min(Date.now() + Math.min(cmd.timeoutMs || 8000, 15000), deadline);
            (function poll() {
              var el = find(cmd);
              // Found is not the same as done — the element can appear a frame before the
              // data it renders, so settle before reporting what the screen shows.
              if (el && visible(el)) return settleThenReply(id, { found: true }, deadline);
              if (Date.now() > waitEnd || hid()) return reply(id, { ok: false, error: 'timeout: ' + missError(cmd), snapshot: snapshot() });
              setTimeout(poll, 200);
            })();
            return;
          }
          // scroll — the reading position is state too: a sticky bar, a panel that follows
          // the reader, a lazily rendered section can only be CHECKED by scrolling. With a
          // target, scroll it into view; without one, value is 'top' | 'bottom' | a pixel
          // offset. Replies with the settled snapshot (pageText includes fixed/sticky text).
          if (cmd.action === 'scroll') {
            whenPresent(function () {
              var target = (cmd.molId || cmd.selector || cmd.text) ? find(cmd) : null;
              if ((cmd.molId || cmd.selector || cmd.text) && !target) return reply(id, { ok: false, error: missError(cmd), snapshot: snapshot() });
              try {
                if (target) { highlight(target); target.scrollIntoView({ block: 'start' }); }
                else {
                  var v = String(cmd.value == null ? 'bottom' : cmd.value).trim().toLowerCase();
                  var y = v === 'top' ? 0 : v === 'bottom' ? document.documentElement.scrollHeight : Number(v);
                  if (!isFinite(y)) return reply(id, { ok: false, error: 'scroll value must be top, bottom or a pixel offset (got ' + v + ')' });
                  window.scrollTo(0, y);
                }
              } catch (e) {
                return reply(id, { ok: false, error: String((e && e.message) || e), snapshot: snapshot() });
              }
              // Let scroll-driven UI (observers, sticky positioning) react before reading.
              setTimeout(function () {
                settleThenReply(id, { scrollY: Math.round(window.scrollY), scrollHeight: document.documentElement.scrollHeight, viewportHeight: window.innerHeight }, deadline);
              }, 450);
            }, deadline);
            return;
          }
          // click / fill / select — never act on a page that has not rendered yet, and
          // auto-wait for a target that is still mounting (a lazy route chunk, a
          // data-gated render). Answering "element not found" the instant the command
          // landed made the executor conclude the control does not exist.
          whenPresent(function () {
            var findEnd = Math.min(Date.now() + FIND_MS, deadline);
            (function act() {
              var el = find(cmd);
              if (!el) {
                if (Date.now() < findEnd && !hid()) return setTimeout(act, 150);
                return reply(id, { ok: false, error: missError(cmd), snapshot: snapshot() });
              }
              highlight(el);
              try {
                if (cmd.action === 'click') el.click();
                else if (cmd.action === 'fill' || cmd.action === 'select') { try { el.focus(); } catch (e) {} setNativeValue(el, cmd.value == null ? '' : String(cmd.value)); }
                else return reply(id, { ok: false, error: 'unknown action: ' + cmd.action });
              } catch (e) {
                return reply(id, { ok: false, error: String((e && e.message) || e), snapshot: snapshot() });
              }
              // Post-action settle: a fixed 250ms raced the API round-trip a click triggers —
              // the snapshot showed the PRE-result UI (no QR yet) and the executor declared
              // failure. A minimum beat first (handlers may start work a frame later), then
              // the shared present+quiet gate above, which also covers a click that starts a
              // route transition (the new route's chunk, fetch, and render all land well
              // after the old 1.5s DOM cap gave up).
              if (hid()) return settleThenReply(id, null, deadline);
              setTimeout(function () { settleThenReply(id, null, deadline); }, 350);
            })();
          }, deadline);
        }
        window.addEventListener('message', function (event) {
          if (event.source !== window.parent) return;
          var d = event.data;
          if (!d || d.type !== 'molecule:ui-command') return;
          // Idempotent retries: the host re-sends a command until it gets a reply (the iframe/bridge
          // is often mid-mount or mid-reload — after navigate_preview — when it first fires, so a
          // single postMessage is dropped). Re-send the cached result if already done; ignore a
          // retry that lands while still in progress so a click/fill NEVER double-fires.
          if (d.id) {
            if (uiResults[d.id]) { try { window.parent.postMessage(uiResults[d.id], '*'); } catch (e) {} return; }
            if (uiSeen[d.id]) return;
            uiSeen[d.id] = true;
          }
          try { run(d); } catch (e) { reply(d && d.id, { ok: false, error: String((e && e.message) || e) }); }
        });
      })();
    </script>
`

/**
 * Idempotently insert {@link PREVIEW_INTERACT_BRIDGE_SCRIPT} into a scaffolded HTML
 * entry file (`index.html`, or SvelteKit's `src/app.html`), immediately before the
 * closing `</body>`. Modeled exactly on {@link injectPreviewRuntimeBridge}: idempotent
 * (keyed on the `mol:interact-bridge` sentinel comment), a no-op when the file is
 * missing / already has the bridge / has no `</body>`.
 *
 * Called from BOTH scaffold paths (right after `injectPreviewRuntimeBridge`) so the
 * live-preview control reaches every app from one place: `copyTemplateInstance` (the
 * flagship templates) and `createAppProject` (custom builds). Without it, only
 * IMPORTED apps (which get the runtime-proxy bundle) could be driven by Synthase — a
 * scaffolded app's preview would have no interaction channel.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @returns Whether the bridge was inserted.
 */
export async function injectPreviewInteractBridge(
  htmlPath: string,
  publicDir?: string,
): Promise<boolean> {
  // Idempotency keyed on the injected sentinel.
  return injectPreviewBridge(htmlPath, publicDir, 'interact-bridge', PREVIEW_INTERACT_BRIDGE_SCRIPT)
}

// ---------------------------------------------------------------------------
// The LIVENESS bridge — the one preview script that is not injected here.
//
// It is BAKED into each template's `index.html` (and the shared
// `index.html.tpl`), delimited by `mol:preview-bridge:start` / `:end`, because it
// is the script that tells the IDE's preview panel the app rendered, crashed or
// recovered — the signal the panel's overlay waits on, and the one thing that
// must be in place even for a document the scarfolder never touches. Being baked
// is also why it was the largest thing in the entry document (13 KB of the 63 KB
// flash-m77 read).
//
// So the injector does not ADD it: it MOVES the baked copy into the app's static
// directory and replaces the delimited region with the one-line reference that
// loads it. The script text is taken from the document itself (the baked copy is
// the single source of it), so the site, the templates and this code cannot
// drift. A document without the region is left exactly as it is — a template that
// never carried the liveness bridge does not suddenly start posting to the IDE.
// ---------------------------------------------------------------------------

/** The baked liveness region, with the markup between its delimiters captured. */
const PREVIEW_LIVENESS_REGION =
  /[ \t]*<!--\s*mol:preview-bridge:start\s*-->([\s\S]*?)<!--\s*mol:preview-bridge:end\s*-->[ \t]*\n?/

/** A `<script>` tag with NO `src` — i.e. still an inline copy, not a reference. */
const INLINE_SCRIPT_BODY = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/

/**
 * Move the baked liveness bridge out of an HTML entry document and into the app's
 * static directory, leaving the reference that loads it. Idempotent: a document
 * whose region already holds the reference is left alone.
 *
 * @param htmlPath - Absolute path to the scaffolded HTML entry file.
 * @param publicDir - The app's configured static dir, when the caller knows it.
 * @returns Whether the document was rewritten.
 */
export async function injectPreviewLivenessBridge(
  htmlPath: string,
  publicDir?: string,
): Promise<boolean> {
  if (!existsSync(htmlPath)) return false
  const html = await readFile(htmlPath, 'utf-8')
  const region = PREVIEW_LIVENESS_REGION.exec(html)
  if (!region) return false
  if (!INLINE_SCRIPT_BODY.test(region[1])) return false
  const reference = await writePreviewBridgeAsset(htmlPath, publicDir, 'preview-bridge', region[1])
  const next = html.slice(0, region.index) + reference + html.slice(region.index + region[0].length)
  await writeGuarded(htmlPath, next)
  return true
}

// ---------------------------------------------------------------------------
// IDE8 — activity-capture PRODUCER wiring (docs/BAAS-activity.md §3-4)
//
// The molecule.dev IDE already DELIVERS the runtime channel: a sandbox boots
// with `MOLECULE_ACTIVITY_URL` (+ `MOLECULE_VAULT_TOKEN` / `MOLECULE_APP_ID`)
// in `process.env` (Sandbox `buildSandboxEnv` for cold boots; `materializeProjectEnv`
// → `.env` → `--env-file` for pooled boots), and the `/v1/activity` ingest +
// SSE + Activity panel are built. But NOTHING in a scaffolded app ever READ that
// env: no app called `setSink(createHttpSink())`, and no capture provider was
// bonded, so `record()` always no-oped and the panel was always empty for real
// activity. This injects the missing producer half into EVERY scaffolded app's
// API boot, from one place — both `copyTemplateInstance` (the baked flagship
// fast path) and the package-driven path (custom builds via `create.ts`) — so
// it reaches all flagships + custom builds without sweeping N hand-curated
// `bonds/index.ts` files (the same approach as `injectPreviewNavBridge`).
// ---------------------------------------------------------------------------

/**
 * The scaffolded `api/src/bonds/_activity-capture.ts` module written into every
 * app and called LAST in `setupBonds()`. Guarded on `MOLECULE_ACTIVITY_URL` so
 * it is a complete no-op outside the molecule.dev IDE — a standalone build never
 * captures, never POSTs to an assumed endpoint, and keeps its real providers.
 *
 * The platform also chooses HOW a capturable category is captured, via
 * `MOLECULE_ACTIVITY_MODE`: `intercept` (the default, and what a dev sandbox
 * gets) REPLACES the real provider so nothing is delivered, while `tee` (what a
 * production deploy gets) WRAPS it so the side effect is really delivered AND
 * recorded. Reading an explicit env var rather than sniffing `NODE_ENV` keeps
 * the platform the single authority — and the default has to stay `intercept`,
 * because a project scaffolded before tee mode existed carries a module that
 * intercepts unconditionally (see the "Updating this file" section in the
 * generated module, and the deploy-time check in molecule-dev's
 * `runtime/production.ts`).
 *
 * Prettier-clean as written (single quotes, no semicolons, 2-space, trailing
 * commas) because the sandbox scaffold path runs with `--skip-install` and so
 * skips the post-scaffold Prettier pass.
 */
const ACTIVITY_CAPTURE_BOOT_MODULE = `/**
 * Activity-capture producer wiring (molecule.dev managed sandbox).
 *
 * The PRODUCER half of the activity surface (docs/BAAS-activity.md §3-4). When
 * this app runs inside the molecule.dev IDE, the platform injects
 * \`MOLECULE_ACTIVITY_URL\` (+ \`MOLECULE_VAULT_TOKEN\` / \`MOLECULE_APP_ID\` /
 * \`MOLECULE_ACTIVITY_MODE\`) into the container env. \`setupActivityCapture()\` —
 * called last in \`setupBonds()\` — reads that env and, ONLY when
 * \`MOLECULE_ACTIVITY_URL\` is present:
 *
 *  1. bonds the HTTP activity sink (\`@molecule/api-activity-http\`) so every
 *     \`record()\` POSTs the event to the IDE's \`/v1/activity\` ingest endpoint;
 *  2. routes each ALREADY-bonded capturable provider (email / sms / push /
 *     webhook / channel) through its capture provider — in one of TWO MODES.
 *
 * ## The two modes — \`MOLECULE_ACTIVITY_MODE\`
 *
 * - \`intercept\` (the default): the real provider is REPLACED by the
 *   intercept-only capture provider. A \`sendMail()\` / webhook dispatch / push is
 *   recorded and returns a synthetic success, and NOTHING is actually delivered.
 *   This is the molecule.dev dev experience — "captured, not delivered" — and it
 *   is what a dev sandbox gets.
 * - \`tee\`: the real provider is WRAPPED by the capture provider. The side effect
 *   is really DELIVERED through the app's own provider AND recorded with its
 *   real outcome. This is what a PRODUCTION deploy gets: a deployed app must
 *   really send its emails, so production side effects are teed, never
 *   intercepted.
 *
 * The mode is read from the platform-provided env rather than guessed from
 * \`NODE_ENV\`, so the platform stays the single authority on it. Any unset or
 * unrecognized value means \`intercept\`, which leaves the dev default unchanged.
 *
 * If a category's capture wiring cannot be honoured — the capture package is
 * missing, or too old to expose its tee factory — that category keeps its REAL
 * provider bonded and is simply not captured. Delivering for real always wins
 * over capturing.
 *
 * Outside the IDE (no \`MOLECULE_ACTIVITY_URL\`) this is a complete no-op: the env
 * guard returns before importing anything, so a standalone build never captures,
 * never POSTs to an assumed endpoint, and keeps its real email/webhook
 * providers. Safe to ship in every app.
 *
 * ## Updating this file
 *
 * \`mlcl create\` generates this module, and it is safe to replace wholesale with
 * a newer generated copy. Projects scaffolded BEFORE \`tee\` mode existed carry a
 * version that ignores \`MOLECULE_ACTIVITY_MODE\` and intercepts every send
 * whenever \`MOLECULE_ACTIVITY_URL\` is set — including in production, where real
 * emails were captured instead of delivered. The platform detects that (it looks
 * for the string \`MOLECULE_ACTIVITY_MODE\` in this file) and turns activity
 * capture OFF for such a deploy rather than swallowing real sends, so an old
 * project still delivers — it just gets no production Activity panel entries. To
 * get production capture back, replace this file with the current version: ask
 * Synthase to "update api/src/bonds/_activity-capture.ts to the current version
 * with tee mode", or copy it from a freshly-scaffolded project.
 *
 * @module
 */

/**
 * Capturable bond categories, each paired with the capture package that records
 * its calls as activity events and the name of that package's factory for
 * WRAPPING a real provider (tee mode). Only categories the app has already
 * bonded are touched at all (see {@link setupActivityCapture}).
 */
const CAPTURE_PROVIDERS: ReadonlyArray<readonly [string, string, string]> = [
  ['email', '@molecule/api-emails-capture', 'createEmailCaptureProvider'],
  ['sms', '@molecule/api-sms-capture', 'createSMSCaptureProvider'],
  ['push-notifications', '@molecule/api-push-capture', 'createPushCaptureProvider'],
  ['webhook', '@molecule/api-webhook-capture', 'createWebhookCaptureProvider'],
  ['channel', '@molecule/api-channel-capture', 'createChannelCaptureProvider'],
]

/**
 * Wire the activity-capture producer when running inside the molecule.dev IDE.
 *
 * MUST be called LAST in \`setupBonds()\`, after the real providers are bonded, so
 * the capturable categories can be swapped (intercept) or wrapped (tee). A no-op
 * when \`MOLECULE_ACTIVITY_URL\` is unset (any standalone build).
 */
export async function setupActivityCapture(): Promise<void> {
  if (!process.env.MOLECULE_ACTIVITY_URL) {
    // Not running inside the molecule.dev IDE — never capture and never POST to
    // an assumed endpoint. The app's real providers stay bonded.
    return
  }

  // Explicit and platform-provided. Anything other than 'tee' — including unset,
  // which is what an older platform sends — means intercept, so the dev
  // semantics this module shipped with never change underneath a project.
  const tee = process.env.MOLECULE_ACTIVITY_MODE === 'tee'

  const [{ setSink }, { createHttpSink }] = await Promise.all([
    import('@molecule/api-activity'),
    import('@molecule/api-activity-http'),
  ])
  // createHttpSink reads MOLECULE_ACTIVITY_URL / MOLECULE_VAULT_TOKEN /
  // MOLECULE_APP_ID per request and no-ops if the URL is ever unset.
  setSink(createHttpSink())

  const { bond, get } = await import('@molecule/api-bond')
  for (const [category, providerPackage, factoryName] of CAPTURE_PROVIDERS) {
    // Only touch a category the app actually uses, so capture never introduces a
    // bond the app never wired itself.
    const realProvider = get(category)
    if (realProvider == null) {
      continue
    }
    // Defense in depth: the capture providers are declared as dependencies by the
    // scaffolder, so this import normally resolves. If one is ever absent, skip
    // capturing THAT category and keep booting — a missing optional dev-telemetry
    // provider must never crash the whole API (it once did, ERR_MODULE_NOT_FOUND).
    try {
      const captureModule = (await import(providerPackage)) as Record<string, unknown>

      if (tee) {
        const createCaptureProvider = captureModule[factoryName]
        if (typeof createCaptureProvider !== 'function') {
          // An older capture package with no tee factory. Keep the REAL provider:
          // in tee mode the side effect MUST still be delivered, and losing the
          // activity record is by far the safer half to lose.
          console.warn(
            '[activity-capture] ' +
              providerPackage +
              ' exposes no ' +
              factoryName +
              '(); delivering ' +
              category +
              ' for real without recording it',
          )
          continue
        }
        bond(category, (createCaptureProvider as (real: unknown) => unknown)(realProvider))
        continue
      }

      const { provider } = captureModule as { provider?: unknown }
      if (provider == null) {
        console.warn(
          '[activity-capture] ' +
            providerPackage +
            ' exports no provider; not capturing ' +
            category,
        )
        continue
      }
      bond(category, provider)
    } catch (error) {
      console.warn(
        '[activity-capture] provider ' +
          providerPackage +
          ' unavailable; not capturing ' +
          category,
        error,
      )
    }
  }
}
`

/**
 * Inject the IDE8 activity-capture producer into a scaffolded API workspace:
 * write \`src/bonds/_activity-capture.ts\` and wire \`await setupActivityCapture()\`
 * as the LAST statement of \`setupBonds()\` (after every real provider is bonded,
 * so the capturable categories can be swapped for their capture decorators).
 *
 * Called from BOTH scaffold paths so the producer reaches every app from one
 * place: \`copyTemplateInstance\` (the baked flagship fast path) and the
 * package-driven path in \`create.ts\` (custom builds, whose \`bonds/index.ts\` the
 * injector has just generated). Idempotent — a re-run, or a template that bakes
 * the wiring in, is detected via the import sentinel and left untouched. A no-op
 * for app-only projects (no \`bonds/index.ts\`) and for a workspace with no
 * \`package.json\` to declare the producer's imports in (see below).
 *
 * @param apiPath - Absolute path to the API workspace (the dir holding \`src/\`).
 * @returns Whether the wiring was injected (false if absent/already present).
 */
export async function injectActivityCaptureBoot(apiPath: string): Promise<boolean> {
  const bondsDir = join(apiPath, 'src', 'bonds')
  const indexPath = join(bondsDir, 'index.ts')
  // App-only / non-standard layouts have no setupBonds to wire into.
  if (!existsSync(indexPath)) return false
  // The manifest is where this producer's imports are DECLARED, and a workspace
  // without one cannot back them: `_activity-capture.ts` imports
  // `@molecule/api-activity` and `@molecule/api-activity-http` (dynamically, with
  // literal specifiers — `tsc` resolves their types from those, so a missing
  // package is a build failure even though nothing runs at boot),
  // while `addActivityCaptureDependencies` below reports "no manifest" by
  // returning false rather than throwing — so the wiring would land with no
  // rollback and no error, in exactly the TS2307 / ERR_MODULE_NOT_FOUND state the
  // transaction below exists to prevent. Refuse BEFORE any write, the same rule
  // refreshMigrateRunnerForManifest applies to the manifest its render needs.
  if (!existsSync(join(apiPath, 'package.json'))) return false

  const modulePath = join(bondsDir, '_activity-capture.ts')
  let src = await readFile(indexPath, 'utf-8')
  // Idempotent: already wired (a re-run, or a future template that bakes it in).
  // Refresh the module to this mlcl's canonical content and re-declare its
  // imports — both idempotent — then leave the wiring untouched.
  if (src.includes("from './_activity-capture.js'")) {
    // The refresh is the SAME transaction as the wiring branch below: the module
    // this mlcl writes may import capture packages an older scaffold's manifest
    // never declared (that is what the declaration step is for), so a failed
    // declaration must put the module back too. Without the rollback a failed
    // refresh left the NEW module behind over a manifest that does not back it —
    // the TS2307 / ERR_MODULE_NOT_FOUND state this step exists to prevent, in a
    // project that compiled before the refresh ran.
    let priorModule: Buffer | null
    try {
      priorModule = await readFile(modulePath)
    } catch (error) {
      // Any read failure other than "not there yet" must not be recorded as
      // absent — see the wiring branch: that entry is what a rollback deletes.
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
      priorModule = null
    }
    // Guarded like the write further down: this refresh overwrites a module the
    // index ALREADY imports, so a write that fails mid-flight (a full disk) would
    // leave a TRUNCATED `_activity-capture.ts` behind — a file server.ts reaches
    // through `bonds/index.ts` at boot, i.e. a project that no longer starts.
    await writeGuarded(modulePath, ACTIVITY_CAPTURE_BOOT_MODULE)
    try {
      await addActivityCaptureDependencies(apiPath)
    } catch (error) {
      try {
        if (priorModule === null) await rm(modulePath, { force: true })
        else await writeFile(modulePath, priorModule)
      } catch (_restoreError) {
        // Best-effort restore; the primary failure is rethrown below.
      }
      throw error
    }
    return false
  }

  // 2a. Add the import, then canonicalize the whole import block via the shared
  //     sorter (same grouping as the project's simple-import-sort) so the new
  //     line lands in the exact slot the linter expects — no per-file position
  //     math, no `--max-warnings 0` regression across the template fleet.
  const firstImport = src.search(/^import /m)
  if (firstImport < 0) return false
  src =
    src.slice(0, firstImport) +
    "import { setupActivityCapture } from './_activity-capture.js'\n" +
    src.slice(firstImport)
  src = sortImportStatements(src)

  // 2b. Insert the call as the LAST statement of setupBonds(). The function's
  //     closing brace is the first column-0 `}` after its declaration in the
  //     Prettier-formatted file every template ships (nested blocks close
  //     indented, so `\n}` matches only the function close).
  const declIdx = src.indexOf('export async function setupBonds(): Promise<void> {')
  if (declIdx < 0) return false
  const closeOffset = src.slice(declIdx).search(/\n\}/)
  if (closeOffset < 0) return false
  const closeIdx = declIdx + closeOffset
  const callBlock =
    '\n\n  // Capture side-effects (email/webhook/push/etc.) to the molecule.dev Activity\n' +
    '  // panel so read_activity can read them (no-op outside the IDE — see\n' +
    '  // ./_activity-capture.ts). KEEP THIS CALL LAST: it routes the capturable\n' +
    '  // providers (email/sms/push/webhook/channel) through capture — replacing\n' +
    '  // them in intercept mode, wrapping them in tee mode — so any bond added\n' +
    '  // BELOW re-bonds the real provider AFTER that and is NOT captured — add\n' +
    '  // new provider bonds ABOVE this line.\n' +
    '  await setupActivityCapture()'
  src = src.slice(0, closeIdx) + callBlock + src.slice(closeIdx)

  // 1. Write the producer module (canonical content — overwrite is idempotent)
  //    — only AFTER the anchors above proved the wiring is possible. Writing it
  //    first left the module behind on every early-return path above: a file
  //    importing @molecule/api-activity* whose dependency declaration (step 3
  //    below) never ran, so the scaffold failed tsc with TS2307 on a project
  //    that has no producer at all. And if the index write itself fails, roll
  //    the module back with it — nothing may be left importing undeclared
  //    packages.
  //
  //    Both writes below plus the manifest declaration are ONE transaction: the
  //    step is only safe if the index, the module and the manifest agree.
  //    - A failed module write restored the module's own previous bytes (it goes
  //      through writeGuarded, like the index), so a truncated producer can
  //      never be left behind.
  //    - A failed index write restored the index's old bytes (writeGuarded), so
  //      the module it would have imported is rolled back with it.
  //    - A failed MANIFEST write (step 3 — a full disk, an unparseable manifest)
  //      used to leave the wiring in place with the module's
  //      `@molecule/api-activity*` imports undeclared: exactly the TS2307 the
  //      step exists to prevent. The index is put back to its pre-injection
  //      bytes and the module is put back too (removed when this call created
  //      it, restored to its own bytes when it predated the call), so a failed
  //      run leaves the project as it was instead of half-wired.
  const priorIndex = await readFile(indexPath)
  // The module is written through the SAME guard as the index below: a bare
  // `writeFile` truncates before it writes, so a write that fails mid-flight
  // would leave a partial `_activity-capture.ts` — a file the index imports, so
  // the project stops compiling and never boots. A pre-existing module's bytes
  // are kept as well, because the rollback below must put it BACK (not delete
  // it) when a later step of this transaction fails.
  let priorModule: Buffer | null
  try {
    priorModule = await readFile(modulePath)
  } catch (error) {
    // Any read failure other than "not there yet" must not be recorded as
    // absent: that entry is what the rollback deletes, and deleting a file this
    // call could not read is the "worse than before" shape the guard exists for.
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
    priorModule = null
  }
  await writeGuarded(modulePath, ACTIVITY_CAPTURE_BOOT_MODULE)
  try {
    await writeGuarded(indexPath, src)
    // 3. DECLARE what the module imports. `_activity-capture.ts` imports
    //    `@molecule/api-activity` and `@molecule/api-activity-http`; writing the
    //    file without adding them produced a scaffold that builds INSIDE the
    //    molecule workspace (where every @molecule/* resolves through workspace
    //    symlinks) and fails everywhere else with:
    //
    //      error TS2307: Cannot find module '@molecule/api-activity'
    //
    //    The imports are dynamic and env-guarded, so nothing fails at RUNTIME
    //    outside the IDE — but `tsc` needs the types at build time regardless, so
    //    `mlcl create && npm install && npm run build` was broken for every user.
    //    Caught by scaffolding a flagship outside the workspace (2026-08-05).
    await addActivityCaptureDependencies(apiPath)
  } catch (error) {
    try {
      // A module this call CREATED is removed; one that PREDATES it is restored
      // to the bytes it had — the rollback must leave the project as it found
      // it, never delete a file the failed step only overwrote.
      if (priorModule === null) await rm(modulePath, { force: true })
      else await writeFile(modulePath, priorModule)
    } catch (_restoreError) {
      // Best-effort restore; the primary failure is rethrown below.
    }
    try {
      await writeFile(indexPath, priorIndex)
    } catch (_restoreError) {
      // Best-effort: writeGuarded has already put the index back for an index
      // write failure, this covers the manifest-write failure after a
      // successful index write.
    }
    throw error
  }

  return true
}

/**
 * Packages the injected `_activity-capture.ts` module imports and therefore must
 * be declared in the scaffolded API's `package.json`. The first two are the
 * module's own DYNAMIC imports of the activity sink (`import('@molecule/api-activity')`
 * / `-http`, literal specifiers, so `tsc` still resolves their types and a
 * missing package fails the build); the rest are the capture providers it imports
 * DYNAMICALLY per bonded category (must match the module's own
 * `CAPTURE_PROVIDERS` list). Omitting any one crashed the API at boot with
 * ERR_MODULE_NOT_FOUND once a bonded category triggered its import.
 */
const ACTIVITY_CAPTURE_DEPENDENCIES = [
  '@molecule/api-activity',
  '@molecule/api-activity-http',
  '@molecule/api-emails-capture',
  '@molecule/api-sms-capture',
  '@molecule/api-push-capture',
  '@molecule/api-webhook-capture',
  '@molecule/api-channel-capture',
]

/**
 * Add the activity-capture packages to a scaffolded API's `package.json`.
 *
 * Pinned exact, matching the workspace dependency policy (`.npmrc`
 * `save-exact=true`). Idempotent: an existing entry is left at whatever version
 * it already pins rather than being rewritten underneath the project.
 *
 * @param apiPath - Absolute path to the API workspace.
 * @returns Whether `package.json` was modified.
 */
async function addActivityCaptureDependencies(apiPath: string): Promise<boolean> {
  const pkgPath = join(apiPath, 'package.json')
  if (!existsSync(pkgPath)) return false

  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as {
    dependencies?: Record<string, string>
  }
  pkg.dependencies ??= {}

  let changed = false
  // `@molecule/api-activity[-http]` are imported by the module with literal
  // `import()` specifiers — dynamic at runtime, but still resolved by `tsc`, so a
  // missing package is a build error; the CAPTURE_PROVIDERS are imported
  // DYNAMICALLY at runtime when their category is bonded (see
  // setupActivityCapture). Declaring only the former shipped a module that
  // crashed the API with ERR_MODULE_NOT_FOUND the moment a bonded category
  // (e.g. email) triggered `import('@molecule/api-emails-capture')` — the package
  // was never installed. Declare the capture providers too so they resolve.
  for (const name of ACTIVITY_CAPTURE_DEPENDENCIES) {
    if (pkg.dependencies[name]) continue
    // The registry is the single source of truth for @molecule/* versions —
    // hardcoding one here would drift the moment the fleet is republished.
    pkg.dependencies[name] = getMoleculeVersion(name)
    changed = true
  }
  if (!changed) return false

  pkg.dependencies = Object.fromEntries(
    Object.entries(pkg.dependencies).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )
  // Guarded: a short write must not leave an unparseable package.json behind
  // (every later scaffold step, and every later mlcl command, parses it).
  await writeGuarded(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  return true
}

/**
 * What `mlcl create --template <app>` copies from
 * `mlcl/templates/apps/<app>/` into the user's destination project:
 *
 *   - `app/`   (full Vite frontend instance — includes app/DESIGN.md)
 *   - `api/`   (full Express api instance)
 *   - `package.json`   (root project package.json with workspaces glue)
 *   - `.gitignore`     (root)
 *
 * Everything else at the template root is monorepo-internal and never
 * exposed: scaffold metadata (`template.json`), polish session state
 * (`.polish/`, `.polish-complete`), stitch markers (`.stitch-complete`),
 * polish-pipeline screen list (`screen-map.json`), node_modules, etc.
 */
export const TEMPLATE_USER_COPY = ['app', 'api', 'package.json', '.gitignore', 'README.md']

// Build/cache outputs only — DO NOT include node_modules. We deliberately
// copy node_modules so the user sandbox is up and running without waiting
// on `npm install`. Sandboxes that share an npm cache with this monorepo
// resolve any missing deps in milliseconds; standalone sandboxes still
// benefit from the pre-resolved tree.
//
// The ENTIRE `.env*` family is skipped (NOT just exact `.env`) — the monorepo's
// env files hold local dev secrets (e.g. `JWT_PRIVATE_KEY=flagship-dev-key-N`,
// `DATABASE_URL=postgres://molecule:molecule@localhost:5433/flagship_*`) that must
// NEVER reach a user sandbox. The leak class is real: a stray `.env.local`,
// `.env.staging`, or `.env.production` next to a template's `.env` would otherwise
// be copied verbatim into the user's project and then committed/pushed (see the
// matching `.env*` + `!.env.example` rule in every scaffolded `.gitignore`). The
// one exception is `.env.example` — a non-secret schema reference that SHOULD ship.
const SKIP_DURING_COPY_EXACT = new Set(['.vite', 'dist', '.turbo', '.next', '.DS_Store'])

/**
 * Whether a directory entry must be skipped when copying a template instance
 * into a user project. Skips build/cache outputs plus the whole secret `.env*`
 * family, while preserving the non-secret `.env.example`.
 */
function shouldSkipDuringCopy(name: string): boolean {
  if (SKIP_DURING_COPY_EXACT.has(name)) return true
  // `.env`, `.env.local`, `.env.staging.<slug>`, … are all secret-bearing; only
  // `.env.example` is a safe-to-ship schema reference.
  return name.startsWith('.env') && name !== '.env.example'
}

/**
 * Canonical `.gitignore` block that protects the ENTIRE `.env*` secrets family
 * (`.env`, `.env.local`, `.env.staging`, `.env.production`, …) while keeping the
 * non-secret `.env.example` schema reference tracked. `git` requires the `!`
 * negation to appear AFTER the `.env*` glob it re-includes, so the order matters.
 *
 * This is the single TS source of the rule for inline-generated `.gitignore`s
 * (e.g. the React Native scaffold). The template `.gitignore` files (the
 * `gitignore*.tpl` files under `templates/`, and each `templates/apps/<app>/`
 * flagship `.gitignore`) embed the same two lines verbatim; a test
 * (`gitignore-secrets.test.ts`) asserts every scaffold `.gitignore` source
 * honours these `git check-ignore` semantics so the fleet can never silently
 * narrow back to exact `.env`.
 */
export const ENV_SECRETS_GITIGNORE = '.env*\n!.env.example'

/**
 * Write the project's AGENTS.md — the conventions file every major coding
 * agent (Claude Code, Codex, Cursor, Pi, …) reads on open. Ships the molecule
 * way for LOCAL development: packages before hand-rolling, bonds for provider
 * wiring, ClassMap for styling, i18n for text, migrations for schema.
 *
 * Idempotent and non-destructive: an existing AGENTS.md (user-written, or one
 * from a previous scaffold with local edits) is never overwritten.
 *
 * @param projectRoot - Absolute path to the project root.
 */
export async function ensureAgentsMd(projectRoot: string): Promise<void> {
  const target = join(projectRoot, 'AGENTS.md')
  const { existsSync } = await import('node:fs')
  if (existsSync(target)) return
  await writeFile(target, await loadTemplate('shared/AGENTS.md.tpl'))
}

/**
 * Write the project-root .npmrc carrying `legacy-peer-deps=true` — required
 * because eslint-plugin-jsx-a11y 6.x (the latest release) still declares
 * `peer eslint ^9` while the fleet pins eslint 10, so a DEFAULT strict-peer
 * `npm install` fails on resolution alone. The file explains itself and says
 * when to delete it. Never clobbers an existing .npmrc (user's own config
 * wins; the template fleet's own npmrc entries would also be lost).
 */
export async function ensureRootNpmrc(projectRoot: string): Promise<void> {
  const target = join(projectRoot, '.npmrc')
  const { existsSync } = await import('node:fs')
  if (existsSync(target)) return
  await writeFile(target, await loadTemplate('shared/npmrc.tpl'))
}

/**
 * Write the project README — the first file any human or agent opens. Carries
 * the molecule attribution, quick start, architecture map, growth commands,
 * and the deploy path so every molecule-built project is self-describing.
 * Idempotent: never overwrites an existing README.
 */
export async function ensureReadmeMd(
  projectRoot: string,
  projectName: string,
  projectType: string,
  framework: string | undefined,
): Promise<void> {
  const target = join(projectRoot, 'README.md')
  const { existsSync } = await import('node:fs')
  if (existsSync(target)) return
  const vars = {
    PROJECT_NAME: projectName,
    PROJECT_DESCRIPTION: `${projectName} — built with Molecule.dev`,
    FRAMEWORK: framework ?? 'React',
  }
  await writeFile(target, await loadTemplate('shared/README.md.tpl', vars))
}

/**
 * Stamp molecule provenance into the project's root package.json — keywords
 * and a molecule metadata block so any tool (or agent) that reads it knows
 * this project was generated by molecule and how to find the ecosystem.
 */
export async function stampMoleculeMetadata(projectRoot: string): Promise<void> {
  const pkgPath = join(projectRoot, 'package.json')
  if (!existsSync(pkgPath)) return
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8')) as Record<string, unknown>
  pkg.keywords = Array.from(
    new Set([...((pkg.keywords as string[]) ?? []), 'molecule', 'molecule.dev']),
  )
  // MERGE into the existing block, never replace it. `create` writes the
  // project's own marker first — `{ projectType: 'app' | 'api' | 'static',
  // framework | apiFramework }` (createAppProject / createApiProject /
  // createStaticProject) — and that marker is load-bearing: without it
  // `detectAppFramework` falls back to probing `appFrameworks` IN ORDER, where
  // `react` precedes `react-native-web` and matches its react/react-dom deps,
  // so a react-native-web app is detected as react (skipping
  // `excludePeerDependencies: ['react-native']` and the framework's shared-code
  // dir / service-worker decisions), and `detectAppProject`'s explicit
  // `projectType === 'app'` check stops matching.
  pkg.molecule = {
    ...((pkg.molecule as Record<string, unknown> | undefined) ?? {}),
    generator: 'mlcl',
    version: mlclVersion(),
    docs: 'https://www.molecule.dev/llms.txt',
  }
  // In-place rewrite of a manifest that ALREADY exists (the create command wrote
  // it moments earlier) — through the guard, like every other rewrite in this
  // module, so a write that fails mid-flight (a full disk, EIO) restores the
  // previous bytes instead of leaving a truncated package.json that every later
  // step — `npm install`, `mlcl inject` — fails to parse.
  await writeGuarded(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

/** The mlcl version stamped into a generated project's provenance block. */
let cachedCliVersion: string | null = null

/**
 * The CLI's own version, read from mlcl's `package.json`.
 *
 * The provenance block records WHICH generator produced the project, so the
 * version must be the one that actually ran — a hardcoded literal here went
 * stale the first time the CLI was bumped (`2.0.0` while the CLI shipped
 * 2.1.0), making every generated project's `molecule.version` describe a
 * generator that never ran. A missing or unreadable manifest must not fail a
 * scaffold over a version string instead: report 'unknown', the same policy
 * molecule-mcp's `serverVersion` follows.
 */
function mlclVersion(): string {
  if (cachedCliVersion === null) {
    try {
      const manifest = JSON.parse(
        readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
      ) as { version?: unknown }
      cachedCliVersion = typeof manifest.version === 'string' ? manifest.version : 'unknown'
    } catch (_error) {
      // A manifest that cannot be read is not a scaffold failure — 'unknown' is
      // an honest answer for the provenance field.
      cachedCliVersion = 'unknown'
    }
  }
  return cachedCliVersion
}

/**
 * Scaffold the security CI + Dependabot config into a generated project so it is
 * secure-by-default from the first commit (SEC3 — "vulnerability scans").
 *
 * Writes, at the TRUE project root (the full-stack monorepo root, or a standalone
 * api/app/status-page/RN root):
 *   - `.github/workflows/security.yml` — npm-audit + gitleaks secret-scan gates
 *   - `.github/dependabot.yml`         — weekly dependency + actions update PRs
 *   - `.gitleaks.toml`                 — secret-scan allowlist (extends defaults)
 *   - `SECURITY.md`                    — policy, run-locally guide, and the
 *                                        documented eslint-plugin-security decision
 *   - `scripts/precommit-secret-scan.mjs` — dependency-free local secret scanner
 *   - `.husky/pre-commit`              — hook that runs the scanner pre-commit
 *   - root `package.json`              — `husky` devDep (exact) + `prepare: husky`
 *
 * The pre-commit pieces are defense-in-depth ALONGSIDE the CI gate: a likely
 * secret is blocked locally BEFORE it ever lands in history, not just caught in
 * CI after the push. scaffold.ts does NOT git-init the project, so the hook
 * activates on the user's first `git init` + `npm install` (husky's `prepare`
 * wires `core.hooksPath` to `.husky/`). husky is already a workspace dep
 * (molecule/mlcl), so it resolves offline; its `prepare` is a no-op when there is
 * no `.git` yet, so it never breaks `npm install`.
 *
 * This is the SINGLE source of the scaffolded security workflow. Call it from
 * BOTH scaffold paths so EVERY generated project gets it — never sweep template
 * dirs by hand: `copyTemplateInstance` (the flagship `--template` fast path) and
 * the custom package-driven path in `create.ts` (once, after the create*Project
 * branch, where `projectPath` is unambiguously the root — so the api/app
 * sub-projects of a full-stack build never get a duplicate nested copy).
 *
 * @param projectRoot - Absolute path to the project root.
 * @param projectName - Used to title SECURITY.md / .gitleaks.toml.
 */
export async function scaffoldSecurityWorkflow(
  projectRoot: string,
  projectName: string,
): Promise<void> {
  const vars = { PROJECT_NAME: projectName }
  await mkdir(join(projectRoot, '.github', 'workflows'), { recursive: true })
  await writeFile(
    join(projectRoot, '.github', 'workflows', 'security.yml'),
    await loadTemplate('shared/github-security-workflow.yml.tpl', vars),
  )
  await writeFile(
    join(projectRoot, '.github', 'dependabot.yml'),
    await loadTemplate('shared/github-dependabot.yml.tpl', vars),
  )
  await writeFile(
    join(projectRoot, '.gitleaks.toml'),
    await loadTemplate('shared/gitleaks.toml.tpl', vars),
  )
  await writeFile(
    join(projectRoot, 'SECURITY.md'),
    await loadTemplate('shared/SECURITY.md.tpl', vars),
  )

  // Local pre-commit secret scan (defense-in-depth alongside the CI gitleaks gate).
  // The scanner ships verbatim from templates/shared/precommit-secret-scan.mjs.tpl
  // (dependency-free Node built-ins, so it runs in any user repo with no install).
  await mkdir(join(projectRoot, 'scripts'), { recursive: true })
  await writeFile(
    join(projectRoot, 'scripts', 'precommit-secret-scan.mjs'),
    await loadTemplate('shared/precommit-secret-scan.mjs.tpl', vars),
  )
  // husky v9 hook format: just the command(s) — the `#!/usr/bin/env sh` + sourcing
  // boilerplate was deprecated in 9.1. git runs hooks from the repo root, so the
  // relative `scripts/...` path resolves.
  await mkdir(join(projectRoot, '.husky'), { recursive: true })
  await writeFile(
    join(projectRoot, '.husky', 'pre-commit'),
    'node scripts/precommit-secret-scan.mjs\n',
  )
  // Wire husky into the ROOT package.json (the git + npm-install root). Done here —
  // the one place called at the true root from BOTH scaffold paths — so it lands
  // exactly once, never in a full-stack monorepo's api/ or app/ sub-package.
  await addHuskyToPackageJson(join(projectRoot, 'package.json'))
}

/**
 * Add husky (exact-pinned) + a `prepare: husky` script to a project's ROOT
 * package.json so the scaffolded `.husky/pre-commit` secret-scan hook activates on
 * the user's first `git init` + `npm install`. Idempotent; preserves any existing
 * `prepare` script by chaining (one that already ends with `husky` is kept as it
 * is, never reduced to a bare `husky`); no-op if the file is absent (e.g. a
 * bare-directory unit-test call). husky is pinned exact per the workspace's
 * no-range rule.
 */
async function addHuskyToPackageJson(packageJsonPath: string): Promise<void> {
  if (!existsSync(packageJsonPath)) return
  const pkg = JSON.parse(await readFile(packageJsonPath, 'utf-8')) as {
    scripts?: Record<string, string>
    devDependencies?: Record<string, string>
    [key: string]: unknown
  }
  const existingPrepare = pkg.scripts?.prepare?.trim()
  // An existing script that already runs husky LAST is kept verbatim (chaining a
  // second `husky` onto it would run the hook installer twice, and rewriting it
  // as a bare `husky` silently DROPPED every step it carried —
  // `"npm run build && husky"` lost the build). Anything else is chained onto.
  const huskyIsLast =
    existingPrepare !== undefined && existingPrepare.split('&&').at(-1)?.trim() === 'husky'
  const prepare = huskyIsLast
    ? (existingPrepare as string)
    : existingPrepare
      ? `${existingPrepare} && husky`
      : 'husky'
  pkg.scripts = { ...(pkg.scripts ?? {}), prepare }
  pkg.devDependencies = sortKeys({ ...(pkg.devDependencies ?? {}), husky: '9.1.7' })
  await writeGuarded(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n')
}

/**
 * Copy a fully-baked template instance from `templateDir` into a fresh user
 * project at `destDir`. Replaces the package-driven scaffold path entirely
 * for `mlcl create --template <app>`: each template at
 * `mlcl/templates/apps/<app>/` already contains the runnable app/api +
 * package.json + .gitignore, so the user project is just a renamed copy.
 *
 * Substitutes `<template>-app`/`<template>-api` in the user's package.json,
 * and syncs app identity (title, theme-color, social meta) from branding.ts into
 * index.html, so the new project's identity is its own, not the template's.
 *
 * @param templateDir - Source: `mlcl/templates/apps/<app>/`.
 * @param destDir - Target user project directory.
 * @param projectName - The user-supplied project name; used in package.json `name`
 *                      and the DATABASE_URL db slot.
 */
export async function copyTemplateInstance(
  templateDir: string,
  destDir: string,
  projectName: string,
): Promise<void> {
  if (!existsSync(templateDir)) {
    throw new Error(`Template directory not found: ${templateDir}`)
  }
  await mkdir(destDir, { recursive: true })

  for (const item of TEMPLATE_USER_COPY) {
    const src = join(templateDir, item)
    if (!existsSync(src)) continue
    const dst = join(destDir, item)
    await copyTreeSkipping(src, dst, shouldSkipDuringCopy)
  }

  // Fonts ship deduped in templates/shared/fonts (one shared copy per face
  // instead of ~1,400 per-app copies — roughly a 1 GB tarball saving). Each
  // template's fonts.json lists its files; materialize them into the scaffolded
  // project so it is byte-identical to what the pre-dedupe template shipped.
  {
    const manifestPath = join(templateDir, 'fonts.json')
    if (existsSync(manifestPath)) {
      const fontFiles = JSON.parse(readFileSync(manifestPath, 'utf8')) as string[]
      const poolDir = join(templateDir, '..', '..', 'shared', 'fonts')
      for (const rel of fontFiles) {
        const dst = join(destDir, rel)
        // `rel` is a template-shipped project-relative path, i.e. DATA: it must
        // stay inside the project it is being materialized into. A `../…` entry
        // (a mistyped path, a template edited by hand, a hostile manifest) would
        // otherwise write a file anywhere on the filesystem — the same
        // containment rule the sibling `copyFontFiles` applies to the font
        // metadata it reads from packages.
        if (!isInsideDir(destDir, dst)) {
          console.warn(`Skipping font outside the project: ${rel}`)
          continue
        }
        await mkdir(dirname(dst), { recursive: true })
        await copyFile(join(poolDir, basename(rel)), dst)
      }
    }
  }

  // Secure-by-default scanning (SEC3): every flagship instance gets the same
  // security CI + Dependabot config as a custom build. Templates ship no
  // `.github/`, so this is the only writer of it on the fast path.
  await scaffoldSecurityWorkflow(destDir, projectName)

  // eslint.config is shared INFRA, not template-specific. The per-template copies
  // are identical to the base tpl but drift over time (e.g. they predate the
  // snake_case-variable allowance that DB-column destructuring needs), so a
  // template build would lint differently than a custom build and the verifier
  // would fail handler code that merely mirrors the template's own snake_case
  // columns. Overwrite with the canonical base so EVERY build lints identically.
  const eslintTpl = await loadTemplate('shared/eslint.config.js.tpl')
  for (const ws of ['api', 'app']) {
    const wsEslint = join(destDir, ws, 'eslint.config.js')
    if (existsSync(join(destDir, ws))) await writeGuarded(wsEslint, eslintTpl)
  }

  // Copy template-root e2e/ + playwright.config.ts into the scaffolded
  // app/ so `cd <project>/app && npx playwright test` runs the full
  // production-ready suite out of the box (no flagship-rollout-verify
  // scaffolding required). Templates may ship a self-contained
  // `playwright.config.ts` OR import from the workspace-shared
  // `_e2e-shared/` helpers (auth.ts, db.ts, playwright.config.shared.ts).
  // When the per-app config / specs reference `../_e2e-shared/...`, we
  // also vendor that shared helper directory into the scaffolded project
  // root so the relative import resolves.
  //
  // app/e2e is a location the template itself never has (it keeps e2e/ at
  // its root), and vitest's default include matches `*.spec.ts` — so every
  // app vite config (createDefaultViteConfig in @molecule/app-vite-config-
  // default, the inline flagship configs, and the custom vite.config.ts.tpl)
  // sets `test.exclude` for `**/e2e/**`, or `npm test` in app/ collects the
  // Playwright specs and fails out of the box. Guarded by the
  // `template-static-site` entry of scripts/typecheck-scaffold.mjs.
  const e2eSrcDir = join(templateDir, 'e2e')
  const e2eDestDir = join(destDir, 'app', 'e2e')
  if (existsSync(e2eSrcDir)) {
    await mkdir(e2eDestDir, { recursive: true })
    await copyTreeSkipping(e2eSrcDir, e2eDestDir, shouldSkipDuringCopy)
  }
  const playwrightConfigSrc = join(templateDir, 'playwright.config.ts')
  if (existsSync(playwrightConfigSrc)) {
    await copyFile(playwrightConfigSrc, join(destDir, 'app', 'playwright.config.ts'))
  }
  // Templates' per-app playwright.config.ts and specs reference
  // `../_e2e-shared/...` from `<project>/app/`. Vendor the workspace
  // `mlcl/templates/apps/_e2e-shared/` directory into `<project>/_e2e-shared/`
  // so those relative imports resolve in the scaffolded sandbox.
  const sharedE2eSrcDir = join(templateDir, '..', '_e2e-shared')
  if (existsSync(sharedE2eSrcDir)) {
    const sharedE2eDestDir = join(destDir, '_e2e-shared')
    await mkdir(sharedE2eDestDir, { recursive: true })
    await copyTreeSkipping(sharedE2eSrcDir, sharedE2eDestDir, shouldSkipDuringCopy)
  }
  // The e2e bond wiring + runner deps (`e2e/bonds.ts`, `test:e2e`, @molecule/app-e2e*,
  // @playwright/test) — the specs above drive the live preview in a sandbox and
  // real browsers elsewhere. Same helpers as the custom path.
  await ensureE2EFiles(join(destDir, 'app'))
  await ensureE2EManifest(join(destDir, 'app'))

  // Sync identity — index.html (tab <title> + social/PWA meta + theme-color) AND
  // package.json (name + description) — from the user's project name and
  // app/src/branding.ts. The template ships its own <slug>-titled index.html plus
  // a baked-in package.json name (e.g. `kanban-board-app`) and a generic
  // `<slug> — full-stack Molecule project` description; this rewrites all of them
  // to the user's `<projectName>-app`/`-api` names + a brand-derived description
  // (APP_NAME — APP_DESCRIPTION) and a branding-matched tab/meta. One source for
  // the whole fleet — see syncIdentityFromBranding (also used by
  // createFullStackProject, so custom builds get the identical sync).
  await syncIdentityFromBranding(destDir, projectName)

  // Rewrite Tailwind @source paths in the copied app/src/index.css.
  // The template ships with relative paths anchored to its OWN depth
  // under `mlcl/templates/apps/<app>/app/src/` (six levels above the
  // workspace root). Once copied to a sandbox at a different depth
  // (e.g. `.smoke-apps/<app>/app/src/`, four levels), those paths no
  // longer resolve and Tailwind silently drops `inset-0`, `z-modal`,
  // and other classes used by the molecule packages — modals render
  // off-screen, drawers don't position. Recompute the prefix from the
  // sandbox's actual location and substitute it into every
  // `@source ".../node_modules/@molecule/..."` line.
  const indexCssPath = join(destDir, 'app', 'src', 'index.css')
  if (existsSync(indexCssPath)) {
    const appPath = join(destDir, 'app')
    const nmPrefix = resolveNmPrefix(appPath)
    const css = await readFile(indexCssPath, 'utf-8')
    const fixed = css.replace(
      /@source\s+"((?:\.\.\/)+)node_modules\//g,
      (_m) => `@source "${nmPrefix}/node_modules/`,
    )
    if (fixed !== css) {
      await writeGuarded(indexCssPath, fixed)
      mlclDebug(
        `[scaffold] Rewrote @source node_modules paths in app/src/index.css to use nmPrefix="${nmPrefix}"`,
      )
    }
  }

  // Stamp self-documenting headers on the theme files so the executor that opens
  // one to recolor learns the truth in-file (theme.css IS the palette; the theme
  // bond is shadowed by it). This is the reliable, prompt-independent channel —
  // editing a file requires opening it. Idempotent (withHeader skips if present).
  const themeCssPath = join(destDir, 'app', 'src', 'theme.css')
  if (existsSync(themeCssPath)) {
    await writeGuarded(
      themeCssPath,
      withHeader(await readFile(themeCssPath, 'utf-8'), THEME_CSS_HEADER_TEMPLATE),
    )
  }
  const themeBondPath = join(destDir, 'app', 'src', 'bonds', 'app-theme-css-variables.ts')
  if (existsSync(themeBondPath)) {
    await writeGuarded(
      themeBondPath,
      withHeader(await readFile(themeBondPath, 'utf-8'), THEME_BOND_REDIRECT_HEADER),
    )
  }
  // Stamp the branding self-doc header so the executor opening branding.ts to
  // rename/rebrand learns it's the single source (title/meta/package.json/icons
  // all derive from it). Same reliable in-file channel as the theme headers above.
  // An app with no app/index.html writes every page from its build, so nothing
  // copies these values: it gets the header that says so.
  const tplBrandingPath = join(destDir, 'app', 'src', 'branding.ts')
  if (existsSync(tplBrandingPath)) {
    const brandingHeader = existsSync(join(destDir, 'app', 'index.html'))
      ? BRANDING_HEADER
      : BUILD_TIME_BRANDING_HEADER
    await writeGuarded(
      tplBrandingPath,
      withHeader(await readFile(tplBrandingPath, 'utf-8'), brandingHeader),
    )
  }
  // Say, beside the template's placeholder posts / fixtures / seed rows, that
  // the user's own content REPLACES them. Same in-file channel as the headers
  // above, one place for all flagships.
  await stampDemoContentNotices(join(destDir, 'app'), join(destDir, 'api'))
  // The throwaway-script convention the system prompt names, made real.
  await ensureScratchDir(destDir)

  // index.html identity (tab title, social/PWA meta, theme-color) was already
  // synced from branding.ts by syncIdentityFromBranding(...) above — that one
  // function now owns the HTML identity sync for BOTH scaffold paths (template +
  // custom), so the logic is no longer duplicated here. indexHtmlPath is declared
  // for the preview-bridge injectors below.
  const indexHtmlPath = join(destDir, 'app', 'index.html')

  // Inject the molecule:navigate sender (PV2 URL bar + PV3 Back/Forward). Flagship
  // templates ship a static index.html that predates this protocol, so without
  // this the copied preview never reports its client-side navigations and the IDE
  // URL bar / Back-Forward stay frozen. Idempotent; runs regardless of branding.ts.
  await injectPreviewNavBridge(indexHtmlPath)

  // Inject the snapshot + self-healing-readiness bridge (P2-16 blurred last-good
  // frame + P2-15 stuck-overlay self-heal). Same single-source rule as the nav
  // bridge — one place reaches every flagship. Idempotent; no-op outside the IDE.
  await injectPreviewSnapshotBridge(indexHtmlPath)

  // Inject the runtime-failure-detection bridge (heartbeat → freeze detection,
  // runtime-error forwarding, blank-render signal). Same single-source rule — the one
  // place a CUSTOM build (no baked sender) gets any runtime detection. Idempotent.
  await injectPreviewRuntimeBridge(indexHtmlPath)

  // Inject the live-preview control bridge (Synthase reads the on-screen UI by
  // data-mol-id + clicks/fills to verify a feature end-to-end). Same single-source
  // rule as the other bridges — one place reaches every flagship. Idempotent;
  // no-op outside the IDE. Mirrors molecule-dev's imported-app proxy bundle.
  await injectPreviewInteractBridge(indexHtmlPath)

  // Move the LIVENESS bridge each template bakes into its index.html (13 KB of
  // the document, sentinel-delimited) into the app's static directory and leave
  // the one-line reference. Runs FIRST of the two bridge groups in terms of what
  // the executor sees, and never adds the bridge to a template that lacks it.
  await injectPreviewLivenessBridge(indexHtmlPath)

  // Wire the IDE8 activity-capture PRODUCER into the copied API boot so a
  // captured email/webhook/push fired in a molecule.dev sandbox surfaces in the
  // Activity panel. Flagship templates ship a hand-curated bonds/index.ts that
  // predates the producer; this is the single place it reaches every one of them.
  // Idempotent; no-op outside the IDE (guarded on MOLECULE_ACTIVITY_URL).
  await injectActivityCaptureBoot(join(destDir, 'api'))

  // Generate fresh .env files in the user sandbox from package-declared
  // secrets. The monorepo's real .env files were skipped during the tree
  // copy (they hold dev secrets); whatever the user actually needs falls
  // out of the registry — nothing more, nothing less. Adding a new env var
  // for a future package means updating that package's `secrets` array
  // in the registry, not editing scaffold logic.
  //
  // We pass templateDir so the .env generator can also union
  // `template.json.packages` into the dep set — flagship templates declare
  // their full bond list there but don't always mirror every entry into
  // `api/package.json` deps (workspace hoisting makes imports work without
  // it). Without this, secrets like STRIPE_SECRET_KEY / MAILGUN_API_KEY
  // wouldn't surface in the generated .env.
  await generateEnvFromPackages(destDir, projectName, templateDir)

  // DECLARE the bond list the template says it uses.
  //
  // The comment above notes flagship templates "don't always mirror every entry
  // into api/package.json deps (workspace hoisting makes imports work without
  // it)". That workaround was applied to .env generation and never to the
  // dependencies themselves, so a scaffolded flagship imports packages it does
  // not depend on. Inside molecule-workspace that resolves anyway; in a plain
  // directory `npm run build` fails with TS2307.
  //
  // Measured 2026-08-05: 159 template workspaces across the fleet were affected
  // (`npm run scan:undeclared-imports` at the workspace root).
  await declareTemplatePackages(destDir, templateDir)

  // Populate __setup__/*.sql from the resource packages declared in
  // template.json. The squashed `0010_<app>_tables.sql` baked into a
  // flagship template only contains tables the flagship author thought
  // to dump — resource packages added later (e.g. @molecule/api-resource-
  // payment for Stripe billing) will silently lack their DDL, and any
  // /billing/* call hits "relation \"payments\" does not exist". The
  // standard scaffold's migrate.ts.tpl already replays __setup__/*.sql
  // after migrations/, so as long as we drop the canonical payments.sql
  // (and any other resource-package SQL) into __setup__/ here, those
  // tables get created on first boot. This mirrors what the registry-
  // driven scaffold path does via copySqlSetupScripts(); we replicate
  // it for the --template fast path that copyTemplateInstance services.
  const apiPathForSetup = join(destDir, 'api')
  if (existsSync(apiPathForSetup)) {
    try {
      const templatePackages = await readTemplatePackages(templateDir)
      if (templatePackages.length > 0) {
        const allApiPackages = loadRegistry('api')
        // copySqlSetupScripts writes into `<api>/__setup__/` but does not
        // create the directory itself (the registry-driven scaffold path
        // mkdirs it earlier); ensure it exists for the template fast path.
        await mkdir(join(apiPathForSetup, '__setup__'), { recursive: true })
        await copySqlSetupScripts(apiPathForSetup, templatePackages, allApiPackages)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      mlclDebug(`[scaffold] copySqlSetupScripts skipped: ${msg}`)
    }

    // The template's OWN api/migrations/*.sql arrived with the tree copy above,
    // unstamped. They are Postgres dialect whatever the app runs (148 of the 150
    // flagship templates declare api-database-postgresql; the two that also name
    // pglite are the same dialect), and a non-Postgres bond rewrites them as it
    // applies them — so a SQLite/MySQL app's copy carries the same header
    // {@link copySqlSetupScripts} writes, naming the database its migrations run
    // on. Without it X1 flash-m69 read these very files as the convention to
    // follow ('the existing `users` migration uses `uuid`/`timestamptz` too') and
    // wrote its own schema in Postgres dialect for a SQLite app (+05:14).
    await stampMigrationDialect(
      join(apiPathForSetup, 'migrations'),
      await projectDatabasePackage(apiPathForSetup),
    )

    // Overwrite the template's checked-in api/src/scripts/migrate.ts with
    // the canonical migrate.ts.tpl. Most flagship templates were captured
    // before migrate.ts.tpl learned to replay __setup__/*.sql after
    // migrations/, so their copies still only run the squashed migration
    // and silently skip resource-package DDL we just dropped above. By
    // re-emitting from the template at scaffold time, every fresh smoke-
    // app picks up new mechanics in the .tpl without us having to re-poll
    // every frozen template copy. The refresh re-renders from the template's
    // own manifest (the browser-profile PGlite branch is emitted reachable
    // when that manifest declares the pglite bond in either dependency key,
    // then promoted to a production pin) and its write is GUARDED: a failed
    // write restores the copied bytes, so the "skipped" log below cannot
    // describe the truncated runner a mid-flight write failure would
    // otherwise leave as the file a scaffolded project boots from.
    try {
      await refreshMigrateRunnerForManifest(apiPathForSetup)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      mlclDebug(`[scaffold] migrate.ts refresh skipped: ${msg}`)
    }
  }

  // Close the @molecule dependency set in the copied manifests. Template
  // manifests declare only the packages the template imports DIRECTLY; the
  // molecule peers of those packages (e.g. api-server-default-express →
  // api-error-tracking/logger/cors) are npm peerDependencies, and sandbox
  // installs run `--legacy-peer-deps` (peer auto-install off) — so every
  // flagship-template scaffold booted in a sandbox crashed at runtime on the
  // first missing peer import (2026-08-10: ERR_MODULE_NOT_FOUND
  // @molecule/api-error-tracking, API dead behind a rendering frontend).
  // Writing the registry-computed closure into the manifest makes the install
  // correct under ANY npm flags and any installer.
  await ensureMoleculePeerClosure(destDir)
}

/** The `@molecule/*` packages an app's e2e setup imports (see {@link ensureE2EManifest}). */
const E2E_PACKAGES = [
  '@molecule/app-e2e',
  '@molecule/app-e2e-fixtures-default',
  '@molecule/app-e2e-playwright',
  '@molecule/app-e2e-preview',
] as const

/**
 * Give an app's package.json the e2e tooling its vite config already imports
 * (`vite-preview-bridge-plugin.ts` pulls in `@molecule/app-e2e-preview/vite`):
 * `@molecule/app-e2e` (Playwright's test/expect/page with the browser as a
 * swappable bond), the preview + playwright bonds, `@playwright/test` (the
 * runner — it never downloads browsers on install) and a `test:e2e` script.
 * Each package ends up with ONE owning declaration: a pin already present in
 * `dependencies` is left there untouched and is not mirrored into
 * `devDependencies`, and an existing duplicate is reduced to the runtime copy
 * (the same policy as {@link ensureMoleculePeerClosure}/`addPackages` — a
 * declared package counts as present and its pin is never rewritten).
 * Idempotent; one place for custom apps AND every template.
 */
export async function ensureE2EManifest(appPath: string): Promise<void> {
  const manifestPath = join(appPath, 'package.json')
  if (!existsSync(manifestPath)) return
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    scripts?: Record<string, string>
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  manifest.scripts = { ...(manifest.scripts ?? {}) }
  if (!manifest.scripts['test:e2e']) manifest.scripts['test:e2e'] = 'playwright test'
  // `--only-changed` selects a spec when the spec itself, or a file it imports,
  // changed; with nothing selected Playwright prints nothing and exits 0, which
  // reads as a pass. The `--list` first makes the count explicit ("Total: 0
  // tests in 0 files"), so an empty selection can never be mistaken for green.
  if (!manifest.scripts['test:e2e:changed']) {
    manifest.scripts['test:e2e:changed'] =
      'playwright test --only-changed --list && playwright test --only-changed'
  }
  const dev = { ...(manifest.devDependencies ?? {}) }
  const runtime = manifest.dependencies ?? {}
  const tooling: Array<[name: string, version: string | undefined]> = E2E_PACKAGES.map((name) => [
    name,
    getMoleculeVersion(name),
  ])
  tooling.push(['@playwright/test', loadToolchain().app['@playwright/test']])
  for (const [name, version] of tooling) {
    // Consult BOTH dependency sections before adding anything. A runtime
    // declaration owns the pin: npm installs both sections, so writing a dev
    // copy at the newer registry version left the manifest pinning two versions
    // of the same package and the executed tooling disagreeing with it.
    if (runtime[name] !== undefined) {
      delete dev[name]
      continue
    }
    if (!dev[name] && version) dev[name] = version
  }
  manifest.devDependencies = Object.fromEntries(
    Object.entries(dev).sort(([a], [b]) => a.localeCompare(b)),
  )
  await writeGuarded(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}

/**
 * Give an app an `e2e/` it can run: `e2e/bonds.ts` (which browser: the live
 * preview in a molecule sandbox, real Playwright elsewhere) always; and, when
 * the app has no e2e of its own (a custom app — templates ship theirs), a
 * `playwright.config.ts` plus a smoke spec so `npm run test:e2e` works from
 * the first commit. Idempotent.
 */
export async function ensureE2EFiles(appPath: string): Promise<void> {
  const e2eDir = join(appPath, 'e2e')
  const fresh = !existsSync(e2eDir)
  await mkdir(e2eDir, { recursive: true })
  const bonds = join(e2eDir, 'bonds.ts')
  if (!existsSync(bonds)) await writeFile(bonds, await loadTemplate('app/shared/e2e/bonds.ts.tpl'))
  const setup = join(e2eDir, 'global-setup.ts')
  if (!existsSync(setup))
    await writeFile(setup, await loadTemplate('app/shared/e2e/global-setup.ts.tpl'))
  if (fresh) {
    await writeFile(
      join(e2eDir, 'smoke.spec.ts'),
      await loadTemplate('app/shared/e2e/smoke.spec.ts.tpl'),
    )
    const config = join(appPath, 'playwright.config.ts')
    if (!existsSync(config))
      await writeFile(config, await loadTemplate('app/shared/playwright.config.ts.tpl'))
  }
}

/**
 * Add the full registry `moleculePeers` + `defaultProvider` closure of each
 * manifest's `@molecule/*` dependencies as DIRECT pinned dependencies.
 *
 * `defaultProvider` is part of the closure because cores lazily import their
 * default bond at runtime (e.g. `api-rate-limit` falls back to
 * `api-rate-limit-memory`) — a peers-only closure still crashed on that edge.
 * Versions come from the registry `moleculeVersions` map (exact pins).
 * Unknown names (not in the registry) are skipped defensively.
 *
 * @param destDir - The scaffolded project root (manifests at `package.json`,
 *   `api/package.json`, `app/package.json` are each closed independently).
 * @returns The package names added, per manifest (for logging/tests).
 */
export async function ensureMoleculePeerClosure(
  destDir: string,
): Promise<Record<string, string[]>> {
  const registryPackages = new Map(loadRegistry().map((p) => [p.name, p]))
  const added: Record<string, string[]> = {}
  for (const rel of ['package.json', join('api', 'package.json'), join('app', 'package.json')]) {
    const manifestPath = join(destDir, rel)
    if (!existsSync(manifestPath)) continue
    let manifest: { dependencies?: Record<string, string> }
    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as typeof manifest
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      mlclDebug(`[scaffold] peer-closure skipped for ${rel}: ${msg}`)
      continue
    }
    const deps = manifest.dependencies ?? {}
    const have = new Set(Object.keys(deps).filter((d) => d.startsWith('@molecule/')))
    const queue = [...have]
    const missing: string[] = []
    while (queue.length > 0) {
      const name = queue.shift()!
      const entry = registryPackages.get(name)
      if (!entry) continue
      // A core's default bond only when nothing in the manifest already provides
      // its category: an app on SQLite also got Postgres, and its bond index then
      // wired both database providers (X1 run sol-m08 read that as a broken
      // scaffold and rewrote every migration).
      // (Same rule as resolveDefaultProviders in ./features.ts.)
      const provided = [...have].some((n) => {
        const m = registryPackages.get(n)?.molecule
        return m?.implements === name && m.type !== 'framework'
      })
      const next = [
        ...(entry.molecule?.moleculePeers ?? []),
        ...(entry.molecule?.defaultProvider && !provided ? [entry.molecule.defaultProvider] : []),
      ]
      for (const peer of next) {
        if (have.has(peer) || !registryPackages.has(peer)) continue
        have.add(peer)
        queue.push(peer)
        missing.push(peer)
      }
    }
    if (missing.length === 0) continue
    for (const name of missing) deps[name] = getMoleculeVersion(name)
    manifest.dependencies = Object.fromEntries(
      Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)),
    )
    await writeGuarded(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
    added[rel] = missing.sort()
  }
  return added
}

/**
 * Recursively copy `src` to `dst`, skipping any entry whose basename is
 * in `skip`. Symlinks are resolved (we copy the target content, not the
 * link) so the destination is fully self-contained.
 *
 * The `skip` set only applies OUTSIDE `node_modules/`. Inside `node_modules/`
 * everything is copied verbatim — package internals like `vitest/dist/`
 * must not be filtered just because their basename happens to match a
 * project-level build-output entry like `dist` or `.vite`. We also preserve
 * symlinks under `node_modules/` (e.g. `node_modules/.bin/vitest -> ../vitest/vitest.mjs`)
 * because those bin entries often use relative imports that break when the
 * link is materialised as a file copy.
 */
async function copyTreeSkipping(
  src: string,
  dst: string,
  skip: (name: string) => boolean,
  inNodeModules = false,
): Promise<void> {
  const stat = statSync(src)
  if (stat.isFile()) {
    await mkdir(dirname(dst), { recursive: true })
    await copyFile(src, dst)
    return
  }
  if (!stat.isDirectory()) return
  await mkdir(dst, { recursive: true })
  for (const e of await readdir(src, { withFileTypes: true })) {
    if (!inNodeModules && skip(e.name)) continue
    const childSrc = join(src, e.name)
    const childDst = join(dst, e.name)
    const childInNodeModules = inNodeModules || e.name === 'node_modules'
    if (childInNodeModules && e.isSymbolicLink()) {
      const target = await readlink(childSrc)
      await symlink(target, childDst)
      continue
    }
    await copyTreeSkipping(childSrc, childDst, skip, childInNodeModules)
  }
}

/**
 * Sync a scaffolded full-stack project's identity from the user's project name +
 * `app/src/branding.ts` (the single brand source). This is the ONE place that
 * derives a project's identity from branding.ts, called from BOTH scaffold paths —
 * the flagship `--template` fast path (copyTemplateInstance, where the template
 * ships its own `<slug>`-titled index.html + `<slug>` package.json name +
 * brand-mismatched description) AND custom full-stack builds
 * (createFullStackProject, where index.html is generated from index.html.tpl with
 * placeholder defaults). Rewrites, when the file/field exists:
 *
 * **app/index.html** (so the browser tab, social, and PWA chrome match the brand
 * out of the box and a later "rename" / "recolor" updates them):
 *   - `<title>`                                      → APP_NAME
 *   - og:title / twitter:title /
 *     apple-mobile-web-app-title meta `content`      → APP_NAME
 *   - description / og:description /
 *     twitter:description meta `content`             → APP_DESCRIPTION
 *   - theme-color meta `content`                     → BRAND_COLOR
 *   - inserts a self-doc comment above `<title>` linking it back to branding.ts
 *
 * **package.json** (root/app/api):
 *   - root  package.json `name`        → `<projectName>`
 *   - root  package.json `description` → `<APP_NAME> — <APP_DESCRIPTION>`
 *                                        (or just `<APP_NAME>` when there's no
 *                                        description) — never the generic
 *                                        `<slug> — full-stack Molecule project`
 *   - app   package.json `name`        → `<projectName>-app`
 *   - api   package.json `name`        → `<projectName>-api`
 *
 * Robust + idempotent: a missing index.html/branding.ts or package.json file/field
 * is skipped, a regex no-match leaves the file unchanged, a malformed package.json
 * is left untouched, branding.ts is parsed by regex (it's an uninstalled TS file,
 * not importable), and each file is only rewritten when something actually changed.
 * Never throws mid-scaffold — the brand read and the HTML sync are each guarded so
 * a cosmetic identity sync can never abort a build.
 */
async function syncIdentityFromBranding(destDir: string, projectName: string): Promise<void> {
  // Brand name/description/color from branding.ts (regex, not import — see note above).
  let appName: string | null = null
  let appDescription: string | null = null
  let brandColor: string | null = null
  const brandingPath = join(destDir, 'app', 'src', 'branding.ts')
  if (existsSync(brandingPath)) {
    try {
      const branding = await readFile(brandingPath, 'utf-8')
      const readConst = (name: string): string | null => {
        const m = branding.match(new RegExp(`export\\s+const\\s+${name}\\s*=\\s*['"]([^'"]+)['"]`))
        return m ? m[1]! : null
      }
      appName = readConst('APP_NAME')
      appDescription = readConst('APP_DESCRIPTION')
      brandColor = readConst('BRAND_COLOR')
    } catch (_error) {
      // Intentional noop: an unreadable branding.ts leaves the brand values null,
      // so the HTML + package.json edits below simply skip their brand-derived parts.
    }
  }

  // Sync index.html identity (tab title, social/PWA meta, theme-color) from the
  // brand values. Template apps copy a wholesale index.html with the TEMPLATE's
  // hardcoded <title> (literally the slug, e.g. "restaurant-ordering-app") + generic
  // meta; custom builds generate index.html from index.html.tpl with placeholder
  // defaults. Both get rewritten here so branding.ts stays the single source and
  // the browser tab/PWA chrome are correct out of the box. Guarded: no index.html
  // or no branding.ts → skip; a regex no-match leaves the file unchanged.
  const indexHtmlPath = join(destDir, 'app', 'index.html')
  if (existsSync(indexHtmlPath) && existsSync(brandingPath)) {
    try {
      let html = await readFile(indexHtmlPath, 'utf-8')
      const before = html
      // The brand values are DATA (they come from the app's own branding.ts), so
      // every replacement goes through a FUNCTION: a `$` sequence in a value
      // (`$$`, `$&`, `` $` ``, `$'`, `$1`) is special inside a replacement
      // STRING — `APP_NAME = 'P$$G'` would render the title as "P$G" and
      // `'A$&B'` would splice the whole matched `<title>…</title>` back in,
      // silently corrupting the document (the same reason the capture groups are
      // passed explicitly instead of via `$1`/`$2`).
      if (appName) {
        html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${appName}</title>`)
        html = html.replace(
          /(<meta[^>]*(?:property="og:title"|name="twitter:title"|name="apple-mobile-web-app-title")[^>]*content=")[^"]*(")/g,
          (_match, open: string, close: string) => `${open}${appName}${close}`,
        )
      }
      if (appDescription) {
        html = html.replace(
          /(<meta[^>]*(?:name="description"|property="og:description"|name="twitter:description")[^>]*content=")[^"]*(")/g,
          (_match, open: string, close: string) => `${open}${appDescription}${close}`,
        )
      }
      if (brandColor) {
        html = html.replace(
          /(<meta[^>]*name="theme-color"[^>]*content=")[^"]*(")/g,
          (_match, open: string, close: string) => `${open}${brandColor}${close}`,
        )
      }
      // Self-document the cross-file link so a later "rename the app" updates both.
      const idComment =
        '<!-- Identity (title + meta below) mirrors app/src/branding.ts — keep in sync. -->'
      if (!html.includes('mirrors app/src/branding.ts')) {
        html = html.replace(/(\n[ \t]*<title>)/, `\n    ${idComment}$1`)
      }
      if (html !== before) await writeGuarded(indexHtmlPath, html)
    } catch (_error) {
      // Intentional noop: never fail a scaffold over the cosmetic HTML identity sync.
    }
  }

  const editJson = async (
    p: string,
    mutate: (j: Record<string, unknown>) => void,
  ): Promise<void> => {
    if (!existsSync(p)) return
    let json: Record<string, unknown>
    try {
      json = JSON.parse(await readFile(p, 'utf-8')) as Record<string, unknown>
    } catch (_error) {
      // Intentional noop: leave a malformed package.json untouched rather than corrupt it.
      return
    }
    const before = JSON.stringify(json)
    mutate(json)
    if (JSON.stringify(json) !== before) {
      await writeGuarded(p, JSON.stringify(json, null, 2) + '\n')
    }
  }

  // Root: name → projectName; description → brand (APP_NAME — APP_DESCRIPTION).
  await editJson(join(destDir, 'package.json'), (j) => {
    if (typeof j.name === 'string') j.name = projectName
    if (appName) {
      j.description = appDescription ? `${appName} — ${appDescription}` : appName
    }
  })
  // App / API: name → <projectName>-app / <projectName>-api.
  await editJson(join(destDir, 'app', 'package.json'), (j) => {
    if (typeof j.name === 'string') j.name = `${projectName}-app`
  })
  await editJson(join(destDir, 'api', 'package.json'), (j) => {
    if (typeof j.name === 'string') j.name = `${projectName}-api`
  })
}

/**
 * Generate fresh .env files in the user sandbox by introspecting the
 * template's `package.json` deps, looking each `@molecule/*` package up in
 * the registry, and collecting its declared `secrets`. The `.env` content
 * is fully derived from package metadata — no regex sanitization. Adding a
 * new env var means adding a `secrets` entry to the relevant package's
 * registry record; nothing else. A `.env.example` is generated only when the
 * copied template ships none — a curated one (static-site's VITE_SITE_URL /
 * BASE_PATH schema doc) is preserved, never overwritten.
 *
 * The end-user sandbox gets exactly the env vars its actual deps need,
 * with declared defaults where present and empty values otherwise.
 */
async function generateEnvFromPackages(
  destDir: string,
  projectName: string,
  templateDir?: string,
): Promise<void> {
  const registry = loadRegistry()
  const byName = new Map(registry.map((p) => [p.name, p]))

  // Some flagship templates declare bond providers in `template.json.packages`
  // (the canonical "what this app uses" list) but DON'T mirror every entry
  // into `api/package.json` deps — the workspace's npm-workspaces hoisting
  // makes the import-side work without listing every transitive dep. Without
  // unioning template.json into the secret-collection set, bonds like
  // `@molecule/api-payments-stripe` or `@molecule/api-emails-mailgun` would
  // wire correctly at runtime but their declared secrets (STRIPE_SECRET_KEY,
  // MAILGUN_API_KEY, etc.) would never reach the generated .env, leaving
  // users with a half-configured app.
  //
  // template.json is intentionally NOT copied to the user sandbox (it's a
  // polish-pipeline artifact). We read it from the source `templateDir`.
  const templatePackages = templateDir
    ? await readTemplatePackages(templateDir).catch(() => [] as string[])
    : []

  for (const sub of ['app', 'api'] as const) {
    const pkgJsonPath = join(destDir, sub, 'package.json')
    if (!existsSync(pkgJsonPath)) continue
    const pkg = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const declaredDeps = new Set(
      [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})].filter(
        (n) => n.startsWith('@molecule/'),
      ),
    )
    for (const tp of templatePackages) declaredDeps.add(tp)

    const packages = [...declaredDeps]
      .map((n) => byName.get(n))
      .filter((p): p is InferredPackage => Boolean(p))
    const secrets = collectSecrets(packages)
    await generateEnvFile(join(destDir, sub), secrets, sub, projectName)
  }
}

/**
 * Union `template.json.packages` into the scaffolded workspaces' dependencies.
 *
 * Routes by package prefix — `@molecule/api-*` to `api/`, `@molecule/app-*` to
 * `app/` — and only ADDS what is missing, so a template that deliberately pins a
 * different version keeps it.
 *
 * Versions come from the registry (`getMoleculeVersion`), the same source
 * {@link addPackages} uses, so a republished fleet cannot leave these behind.
 *
 * @param destDir - The scaffolded project root.
 * @param templateDir - The template being copied.
 * @returns Names added, per workspace.
 */
async function declareTemplatePackages(
  destDir: string,
  templateDir: string,
): Promise<Record<string, string[]>> {
  const packages = await readTemplatePackages(templateDir)
  const added: Record<string, string[]> = {}
  if (!packages.length) return added

  for (const [sub, prefix] of [
    ['api', '@molecule/api-'],
    ['app', '@molecule/app-'],
  ] as const) {
    const pkgPath = join(destDir, sub, 'package.json')
    if (!existsSync(pkgPath)) continue

    const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    pkg.dependencies ??= {}
    const known = new Set([
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.devDependencies ?? {}),
    ])

    const missing = packages.filter((name) => name.startsWith(prefix) && !known.has(name))
    if (!missing.length) continue

    for (const name of missing) pkg.dependencies[name] = getMoleculeVersion(name)
    pkg.dependencies = Object.fromEntries(
      Object.entries(pkg.dependencies).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
    )
    await writeGuarded(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
    added[sub] = missing
  }

  return added
}

/**
 * Read `template.json.packages` if present. Templates that ship one declare
 * the full bond list there even when api/package.json doesn't mirror every
 * entry. Returns `[]` for plain scaffolds without a template.json (their
 * package.json is authoritative).
 */
async function readTemplatePackages(templateDir: string): Promise<string[]> {
  const candidate = join(templateDir, 'template.json')
  if (!existsSync(candidate)) return []
  const raw = await readFile(candidate, 'utf-8')
  const parsed = JSON.parse(raw) as { packages?: string[] }
  return Array.isArray(parsed.packages) ? parsed.packages : []
}

/**
 * Format a JSON object in a Prettier-compatible way.
 *
 * Collapses short arrays to single lines to match Prettier's default JSON formatting.
 *
 * @param obj - Object to serialize.
 * @returns JSON string with trailing newline.
 */
function formatJson(obj: unknown): string {
  const raw = JSON.stringify(obj, null, 2)
  return (
    raw.replace(/\[\n([\s\S]*?)\n(\s*)\]/g, (_match, content: string, indent: string) => {
      const items = (content as string)
        .split(',\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const collapsed = `[${items.join(', ')}]`
      return collapsed.length + indent.length <= 80 ? collapsed : _match
    }) + '\n'
  )
}

/**
 * Best-effort read of `BRAND_COLOR` from a project's `branding.ts`.
 *
 * We deliberately parse with a regex (not `import`) because `branding.ts` is
 * a TypeScript file inside a fresh, uninstalled project. Falls back to
 * `null` so callers can apply their own default.
 */
function readBrandColorFromBranding(
  projectPath: string,
  sharedSubdir: string | undefined,
): string | null {
  const brandingPath = sharedSubdir
    ? join(projectPath, 'src', sharedSubdir, 'branding.ts')
    : join(projectPath, 'src', 'branding.ts')
  if (!existsSync(brandingPath)) return null
  const content = readFileSync(brandingPath, 'utf-8')
  const m = content.match(/export\s+const\s+BRAND_COLOR\s*=\s*['"]([^'"]+)['"]/)
  return m ? m[1]! : null
}

/**
 * Replace `{{KEY}}` placeholders in template content.
 *
 * Every value is inserted through a FUNCTION, because a replacement STRING is
 * not a literal: `$&` (the whole match), `` $` `` and `$'` (the text around it),
 * and `$$` (a literal `$`) are special, so a value carrying one of them spliced
 * the `{{KEY}}` placeholder — or the template text beside it — back into the
 * generated file instead of the value. The vars here are DATA (a project name,
 * a brand description, an SVG's inner markup, a font-link list), and this is the
 * same policy syncIdentityFromBranding and the font-block merge already state.
 *
 * The substitution is ONE pass over the template, keyed on the placeholder
 * itself. Replacing key by key — the shape this used to have — ran every later
 * key's search over the text the earlier keys had just INSERTED, so a value that
 * carries another key's `{{KEY}}` text was itself substituted: the value was not
 * inserted verbatim, which is what this function's contract (and every caller:
 * a brand description, an SVG's markup) says happens. A single pass inserts each
 * value and never looks at it again.
 *
 * @param content - Template source, `{{KEY}}` placeholders intact.
 * @param vars - The value for each placeholder key.
 * @returns The content with every `{{KEY}}` replaced by its value, verbatim.
 */
export function processTemplate(content: string, vars: Record<string, string>): string {
  const keys = Object.keys(vars)
  if (keys.length === 0) return content
  // Longest key first, so a key that is a prefix of a sibling never wins a
  // position the longer key owns. Each key is escaped: a key is a literal, not a
  // pattern.
  const alternatives = keys
    .map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
  return content.replace(
    new RegExp(`\\{\\{(${alternatives.join('|')})\\}\\}`, 'g'),
    (_match, key: string) => vars[key] as string,
  )
}

/**
 * Read a `.tpl` file from the templates directory and process `{{KEY}}` placeholders.
 */
async function loadTemplate(
  relativePath: string,
  vars: Record<string, string> = {},
): Promise<string> {
  const content = await readFile(join(getTemplatesDir(), relativePath), 'utf-8')
  const processed = processTemplate(content, vars)
  // Sort imports in generated source files for lint-clean output
  if (/\.(ts|tsx|js|mjs)\.tpl$/.test(relativePath)) {
    return sortImportStatements(processed)
  }
  return processed
}

/**
 * Resolve the path to the templates directory.
 * Templates live at `templates/` in the repo root (outside `src/`).
 */
export function getTemplatesDir(): string {
  return join(__dirname, '..', '..', 'templates')
}

// API framework deps are read from registry.json (apiFrameworks section).
function getApiFrameworkDeps(framework: string): {
  deps: Record<string, string>
  devDeps: Record<string, string>
} {
  const frameworks = loadApiFrameworks()
  const fw = frameworks[framework]
  return {
    deps: fw?.dependencies ?? {},
    devDeps: fw?.devDependencies ?? {},
  }
}

/**
 * Create an API project skeleton.
 */
export async function createApiProject(
  projectPath: string,
  projectName: string,
  apiFramework: string = 'express',
  npmOverrides: Record<string, string> = {},
): Promise<void> {
  mlclDebug(`[scaffold] createApiProject: ${projectPath} (framework: ${apiFramework})`)
  await mkdir(projectPath, { recursive: true })

  const toolchain = loadToolchain()

  // For an api-only project this package.json IS the install root, so any
  // `overrides` a selected bond requires (npm honors overrides only from the
  // install root) go here. When created as a full-stack sub-project the caller
  // passes none — the monorepo root carries them workspace-wide instead.
  const packageJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      // migrations/ is watched too: a new migration applies on the restart it causes (X1 flash-m41).
      //
      // `--env-file` on all three is the TEMPLATE fleet's exact line (150/150
      // `templates/apps/*/api/package.json`), and it is load-bearing: without it an
      // api/.env the executor writes is dead in the dev server. The platform's
      // `/etc/mol/env` is sourced into the process env before `npm run dev`
      // (dev-server-cmd.ts SOURCE_PLATFORM_ENV_CMD), so platform values still WIN
      // (a real env var beats `--env-file`); in-process, only the keys named in
      // `bonds/index.ts` reach the app via `@molecule/api-secrets-env`. An executor
      // appending a debug variable to `.env` therefore saw it never arrive (X1
      // flash-m64 spent 4 min 26 s on exactly that, reading it as a JWT key
      // mismatch). `mlcl/src/lib/__tests__/scaffold-api-dev-script.test.ts` pins
      // these three lines against the templates so they cannot drift again.
      dev: "tsx watch --include 'migrations/*.sql' --env-file=.env src/server.ts",
      build: 'tsc',
      start: 'node --env-file-if-exists=.env dist/server.js',
      test: 'vitest run',
      'db:setup': 'tsx --env-file=.env src/scripts/migrate.ts',
      typecheck: 'tsc --noEmit',
      lint: 'eslint src/',
      'lint:fix': 'eslint src/ --fix',
      format: "prettier --write 'src/**/*.ts'",
      'format:check': "prettier --check 'src/**/*.ts'",
    },
    dependencies: {
      ...getApiFrameworkDeps(apiFramework).deps,
    },
    devDependencies: {
      ...getApiFrameworkDeps(apiFramework).devDeps,
      ...toolchain.shared,
      ...toolchain.api,
    },
    ...(Object.keys(npmOverrides).length > 0 ? { overrides: npmOverrides } : {}),
    molecule: {
      projectType: 'api',
      apiFramework,
    },
  }

  await writeFile(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n')
  await writeFile(join(projectPath, '.npmrc'), await loadTemplate('shared/npmrc.tpl'))

  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      declaration: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }

  await writeFile(join(projectPath, 'tsconfig.json'), formatJson(tsconfig))

  // Create directory structure
  await mkdir(join(projectPath, 'src', 'App', 'Resource'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'scripts'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'bonds'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'middleware'), { recursive: true })
  await mkdir(join(projectPath, '__setup__'), { recursive: true })

  // Placeholder files (overwritten by injection)
  await writeFile(
    join(projectPath, 'src', 'App', 'router.ts'),
    await loadTemplate('api/router.ts.tpl'),
  )
  await writeFile(
    join(projectPath, 'src', 'bonds', 'index.ts'),
    await loadTemplate('api/bonds-index.ts.tpl'),
  )
  await writeFile(join(projectPath, 'src', 'server.ts'), await loadTemplate('api/server.ts.tpl'))
  // No migrate.ts placeholder here. The skeleton's package selection is not
  // known yet, and the runner statically imports the database bond's pieces
  // (`pg`, `deriveSsl`, the PGlite migrator wrapper) — a placeholder would
  // import packages the manifest cannot declare yet, failing `typecheck` on a
  // real install (the workspace's hoisted node_modules hides exactly this
  // hole). `mlcl inject` writes the real runner, rendered from the real
  // selection, the moment a database package lands; a database-less project
  // never gets a file whose imports nothing declares (its `db:setup` script
  // then fails loudly only if run).
  await writeFile(
    join(projectPath, 'eslint.config.js'),
    await loadTemplate('shared/eslint.config.js.tpl'),
  )
  await writeFile(join(projectPath, '.prettierrc'), await loadTemplate('api/prettierrc.json.tpl'))
  await writeFile(
    join(projectPath, '.prettierignore'),
    await loadTemplate('api/prettierignore.tpl'),
  )
  await writeFile(join(projectPath, '.editorconfig'), await loadTemplate('shared/editorconfig.tpl'))
  await writeFile(join(projectPath, '.gitignore'), await loadTemplate('api/gitignore.tpl'))
}

/**
 * Collect npm `overrides` declared by the selected packages' registry metadata.
 *
 * npm honors a `package.json` `overrides` field ONLY from the install root — a
 * nested dependency's (a bond's) overrides are silently ignored. So a bond that
 * pulls a transitive dependency with a known CVE (e.g. `@molecule/api-realtime-socketio`
 * → socket.io/engine.io → a vulnerable `ws`) cannot fix it from its own package.json;
 * the pin must be written into the GENERATED project's ROOT package.json. Each such
 * bond declares the patched pin via `molecule.npmOverrides` in registry.json, and the
 * scaffolder merges every selected package's entries here so the project resolves the
 * patched transitive at install time.
 *
 * Decoupling: the CLI never hardcodes which package needs which override — it reads it
 * from the registry, so adding a new bond+override requires no scaffolder change.
 *
 * @param selectedPackages - Resolved package names being scaffolded into the project.
 * @param allPackages - Full registry package list (carries `molecule.npmOverrides`).
 * @returns Merged `{ depName: exactVersion }` map (empty when none declared).
 */
export function collectNpmOverrides(
  selectedPackages: string[],
  allPackages: InferredPackage[],
): Record<string, string> {
  const selected = new Set(selectedPackages)
  const merged: Record<string, string> = {}
  for (const pkg of allPackages) {
    if (!selected.has(pkg.name)) continue
    const overrides = pkg.molecule?.npmOverrides
    if (overrides) Object.assign(merged, overrides)
  }
  return merged
}

/**
 * Create a full-stack project with api/ and app/ workspaces.
 *
 * Generates a root monorepo package.json with npm workspaces,
 * then scaffolds both the API and App sub-projects.
 * `fontAssetMode` defaults to legacy copying. A caller generating Vite
 * index.html may explicitly select module URLs, persisted for later sync.
 */
export async function createFullStackProject(
  projectPath: string,
  projectName: string,
  framework: string,
  fontLinks = '',
  extraVars: Record<string, string> = {},
  selectedPackages: string[] = [],
  buildTooling?: BuildTooling,
  apiFramework: string = 'express',
  npmOverrides: Record<string, string> = {},
  fontAssetMode: 'copy' | 'module' = 'copy',
): Promise<void> {
  await mkdir(projectPath, { recursive: true })
  mlclDebug(`[scaffold] createFullStackProject: ${projectPath}`)

  // Root package.json with workspaces. The root is the npm install root, so any
  // `overrides` a selected bond requires (e.g. pinning a patched `ws` for the
  // socket.io realtime bond — npm honors overrides only from the root) go HERE.
  const rootPackageJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    description: `${projectName} — full-stack Molecule project`,
    workspaces: ['api', 'app'],
    scripts: {
      dev: 'npm run dev:api & npm run dev:app',
      'dev:api': 'npm run dev --workspace=api',
      'dev:app': 'npm run dev --workspace=app',
      build: 'npm run build --workspace=api && npm run build --workspace=app',
      'build:api': 'npm run build --workspace=api',
      'build:app': 'npm run build --workspace=app',
      test: 'npm run test --workspace=api && npm run test --workspace=app',
      'test:api': 'npm run test --workspace=api',
      'test:app': 'npm run test --workspace=app',
    },
    ...(Object.keys(npmOverrides).length > 0 ? { overrides: npmOverrides } : {}),
  }

  await writeFile(
    join(projectPath, 'package.json'),
    JSON.stringify(rootPackageJson, null, 2) + '\n',
  )

  await writeFile(join(projectPath, '.gitignore'), await loadTemplate('api/gitignore.tpl'))
  // No DESIGN.md is written here. DESIGN.md is a polish-pipeline artifact
  // — used only by the AI polish/stitch sessions inside this monorepo, not
  // something a runnable user project needs (the copy path takes exactly
  // TEMPLATE_USER_COPY: app/, api/, package.json, .gitignore, README.md).

  // Scaffold both sub-projects
  mlclDebug(`[scaffold] Creating API project: ${join(projectPath, 'api')}`)
  await createApiProject(join(projectPath, 'api'), `${projectName}-api`, apiFramework)
  mlclDebug(`[scaffold] Creating App project: ${join(projectPath, 'app')}`)
  await createAppProject(
    join(projectPath, 'app'),
    `${projectName}-app`,
    framework,
    true,
    fontLinks,
    extraVars,
    selectedPackages,
    buildTooling,
    {},
    fontAssetMode,
  )

  // Now that app/src/branding.ts exists, derive the root package.json description
  // from the brand (replacing the generic `<slug> — full-stack Molecule project`
  // placeholder written above) and re-affirm the app/api names. Same ONE source
  // as the flagship `--template` path — see syncIdentityFromBranding.
  await syncIdentityFromBranding(projectPath, projectName)
}

/**
 * Files the standard app scaffold writes that a static site has no use for:
 * the auth pages and the user menu (nobody logs in to a static site), the
 * settings panel, the PWA registration (no service worker — a static host
 * serves plain files). Removed after `createAppProject` so the static
 * overlay never has to know what the app scaffold might add next.
 */
const STATIC_SITE_REMOVES = [
  'src/pages/Login.tsx',
  'src/pages/Signup.tsx',
  'src/pages/ForgotPassword.tsx',
  'src/pages/ResetPassword.tsx',
  'src/pages/PlanUpdated.tsx',
  'src/components/AuthGuard.tsx',
  'src/components/AppLayout.tsx',
  'src/components/UserMenu.tsx',
  'src/components/OAuthButtons.tsx',
  'src/components/FloatingInput.tsx',
  'src/components/SettingsPanel.tsx',
  'src/pwa.ts',
]

/** Build-tooling devDeps a static site drops — no service worker, no PWA. */
const STATIC_SITE_DROPPED_DEV_DEPS = [
  'vite-plugin-pwa',
  'workbox-core',
  'workbox-expiration',
  'workbox-precaching',
  'workbox-routing',
  'workbox-strategies',
]

/**
 * Scaffold a `static` project: a Vite React site with NO api and NO database,
 * laid out as `<root>/package.json` (workspaces: `app`) + `<root>/app/` — the
 * full-stack shape minus `api/`, so every tool that serves `app/` (the
 * molecule.dev sandbox, the deploy workflows, the template gates) works
 * unchanged. `npm run dev` serves it with Vite; `npm run build` writes `dist/`
 * as one prerendered HTML page per route plus the site's static files
 * (scripts/prerender.mjs, in Node, no browser). BASE_PATH is honoured by every
 * URL through src/site.ts.
 *
 * Built on `createAppProject` (icons, branding, bonds, CSS, config), then
 * overlaid from `templates/static/`: the static vite config + dev plugin, the
 * prerender script, the server entry, the router-less `App`, `main.tsx` that
 * hydrates a prerendered page, the site helpers, and pages/components with no
 * auth. Only React is supported — the prerender renders with react-dom/server.
 *
 * @param projectPath - Project root (the `app/` sub-project is created inside).
 * @param projectName - Base name; the app workspace is `<name>-app`.
 * @param framework - Must be `react`.
 * @param fontLinks - Font `<link>` markup for index.html.
 * @param extraVars - Extra template variables.
 * @param selectedPackages - Selected `@molecule/*` packages (app stack).
 * @param buildTooling - Styling build tooling (Tailwind) from the registry.
 * @param npmOverrides - Root-level npm `overrides` required by selected bonds.
 * @param fontAssetMode - Caller-declared font asset handling; module URLs require a Vite index.html.
 */
export async function createStaticProject(
  projectPath: string,
  projectName: string,
  framework: string,
  fontLinks = '',
  extraVars: Record<string, string> = {},
  selectedPackages: string[] = [],
  buildTooling?: BuildTooling,
  npmOverrides: Record<string, string> = {},
  fontAssetMode: 'copy' | 'module' = 'copy',
): Promise<void> {
  if (framework !== 'react') {
    throw new Error(`static projects support the react framework only (got "${framework}")`)
  }
  await mkdir(projectPath, { recursive: true })
  mlclDebug(`[scaffold] createStaticProject: ${projectPath}`)

  const rootPackageJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    description: `${projectName} — static Molecule site`,
    workspaces: ['app'],
    scripts: {
      dev: 'npm run dev --workspace=app',
      build: 'npm run build --workspace=app',
      preview: 'npm run preview --workspace=app',
      test: 'npm run test --workspace=app',
      typecheck: 'npm run typecheck --workspace=app',
      lint: 'npm run lint --workspace=app',
    },
    ...(Object.keys(npmOverrides).length > 0 ? { overrides: npmOverrides } : {}),
  }
  await writeFile(
    join(projectPath, 'package.json'),
    JSON.stringify(rootPackageJson, null, 2) + '\n',
  )
  await writeFile(join(projectPath, '.gitignore'), await loadTemplate('api/gitignore.tpl'))

  const appPath = join(projectPath, 'app')
  await createAppProject(
    appPath,
    `${projectName}-app`,
    framework,
    true,
    fontLinks,
    extraVars,
    selectedPackages,
    buildTooling,
    {},
    fontAssetMode,
  )
  await applyStaticSiteOverlay(appPath, projectName, extraVars, buildTooling)
  await syncIdentityFromBranding(projectPath, projectName)
}

/**
 * Turn a freshly scaffolded app workspace into a static site: rewrite the
 * scripts and project type, swap the Vite config for the static one, add the
 * dev plugin + prerender script + server entry + site helpers, replace the
 * entry/App/pages/components with the auth-free static set, and remove what
 * a static site does not ship. Idempotent — safe to re-run on the same app.
 *
 * @param appPath - The app workspace (`<root>/app`).
 * @param projectName - For template variables.
 * @param extraVars - Extra template variables.
 * @param buildTooling - Styling build tooling (Tailwind) from the registry.
 */
export async function applyStaticSiteOverlay(
  appPath: string,
  projectName: string,
  extraVars: Record<string, string> = {},
  buildTooling?: BuildTooling,
): Promise<void> {
  const appFrameworks = loadAppFrameworks()
  const fwConfig = appFrameworks['react'] ?? { dependencies: {}, devDependencies: {} }

  // package.json: the static scripts, no PWA tooling, the static project type.
  const pkgPath = join(appPath, 'package.json')
  const pkg = JSON.parse(await readFile(pkgPath, 'utf-8')) as {
    scripts: Record<string, string>
    devDependencies?: Record<string, string>
    molecule?: Record<string, unknown>
  }
  pkg.scripts = {
    ...pkg.scripts,
    dev: 'vite',
    build: 'tsc --noEmit && vite build && node scripts/prerender.mjs',
    preview: 'vite preview',
  }
  for (const dep of STATIC_SITE_DROPPED_DEV_DEPS) delete pkg.devDependencies?.[dep]
  pkg.molecule = { ...(pkg.molecule ?? {}), projectType: 'static', framework: 'react' }
  await writeGuarded(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

  // The static Vite config (base path, dev plugin, no proxy, no PWA) + its plugin.
  const viteImport = fwConfig.vitePlugin?.import ?? ''
  const vitePlugin = fwConfig.vitePlugin?.usage ?? ''
  const plugins = [vitePlugin, buildTooling?.vitePlugin?.usage].filter(Boolean).join(', ')
  const extraConfig = fwConfig.viteExtraConfig ?? ''
  // Both writes below replace files the base scaffold already wrote — the
  // build's entry config and its env types — so they go through the guarded
  // write: a failure mid-flight restores the working bytes instead of leaving a
  // truncated vite.config.ts that no longer parses.
  await writeGuarded(
    join(appPath, 'vite.config.ts'),
    await loadTemplate('static/vite.config.ts.tpl', {
      TAILWIND_IMPORT: buildTooling?.vitePlugin?.import
        ? buildTooling.vitePlugin.import + '\n'
        : '',
      VITE_PLUGIN_IMPORT: viteImport ? viteImport + '\n' : '',
      VITE_PLUGINS: plugins,
      RESOLVE_EXTENSIONS: extraConfig ? `\n  ${extraConfig}` : '',
    }),
  )
  await writeFile(
    join(appPath, 'vite-static-site-plugin.ts'),
    await loadTemplate('static/vite-static-site-plugin.ts.tpl'),
  )
  await mkdir(join(appPath, 'scripts'), { recursive: true })
  await writeFile(
    join(appPath, 'scripts', 'prerender.mjs'),
    await loadTemplate('static/prerender.mjs.tpl'),
  )
  const extraDecl = fwConfig.typeDeclarations ? '\n' + fwConfig.typeDeclarations : ''
  await writeGuarded(
    join(appPath, 'src', 'vite-env.d.ts'),
    await loadTemplate('static/vite-env.d.ts.tpl', { EXTRA_TYPE_DECLARATIONS: extraDecl }),
  )

  // Entry, App, server entry, site helpers, pages and components.
  await copyTemplateDir(join(getTemplatesDir(), 'static', 'react'), join(appPath, 'src'), {
    PROJECT_NAME: projectName,
    ...extraVars,
  })

  for (const rel of STATIC_SITE_REMOVES) {
    await rm(join(appPath, rel), { force: true })
  }
}

/**
 * Copy domain-specific template files (pages, handlers, routes, tiers, theme,
 * and the template's locale extras) from a named app template into the
 * generated project.
 *
 * For app pages, uses framework-specific directories when available:
 * - React/React Native Web: `pages/`
 * - Vue: `pages-vue/`
 * - Svelte: `pages-svelte/`
 * - Solid: `pages-solid/`
 * - Angular: `pages-angular/`
 *
 * Falls back to React pages if the framework-specific directory doesn't exist.
 */
export async function copyTemplateDomainFiles(
  templateName: string,
  framework: string,
  appPath: string,
  apiPath: string | null,
  cliRoot: string,
): Promise<void> {
  const templateDir = join(cliRoot, 'templates', 'apps', templateName)
  if (!existsSync(templateDir)) {
    mlclDebug(`[scaffold] Template directory not found: ${templateDir}`)
    return
  }

  // Determine which pages directory to use. Modern templates store pages
  // at `app/src/pages/` (matching the runtime shape and the symlink
  // contract in CLAUDE.md "Flagship apps: mlcl/templates is the source
  // of truth"). Older templates use the flat `app/pages/`.
  const frameworkSuffix =
    framework === 'react' || framework === 'react-native-web' ? '' : `-${framework}`
  const pagesCandidates = frameworkSuffix
    ? [
        join(templateDir, 'app', 'src', `pages${frameworkSuffix}`),
        join(templateDir, 'app', `pages${frameworkSuffix}`),
        join(templateDir, 'app', 'src', 'pages'),
        join(templateDir, 'app', 'pages'),
      ]
    : [join(templateDir, 'app', 'src', 'pages'), join(templateDir, 'app', 'pages')]
  const sourcePagesDir =
    pagesCandidates.find((p) => existsSync(p)) ?? join(templateDir, 'app', 'pages')

  // Copy app pages
  if (existsSync(sourcePagesDir)) {
    const pagesDestDir = join(appPath, 'src', 'pages')
    await mkdir(pagesDestDir, { recursive: true })
    const files = await readdir(sourcePagesDir)
    for (const file of files) {
      const src = join(sourcePagesDir, file)
      const stat = statSync(src)
      if (stat.isFile()) {
        await copyFile(src, join(pagesDestDir, file))
      }
    }
    mlclDebug(
      `[scaffold] Copied ${files.length} template pages from ${relative(cliRoot, sourcePagesDir)}`,
    )
  }

  // Copy API handlers. Per CLAUDE.md "Flagship apps: mlcl/templates is
  // the source of truth", canonical handler/route paths live under
  // `api/src/{handlers,routes}/` (matching the shape the runtime expects),
  // not at `api/handlers` / `api/routes`. Older templates may still use
  // the flat layout, so try `api/src/handlers/` first and fall back.
  const handlersSrcDir = join(templateDir, 'api', 'src', 'handlers')
  const handlersFlatDir = join(templateDir, 'api', 'handlers')
  const handlersDir = existsSync(handlersSrcDir) ? handlersSrcDir : handlersFlatDir
  if (apiPath && existsSync(handlersDir)) {
    const handlersDestDir = join(apiPath, 'src', 'handlers')
    await mkdir(handlersDestDir, { recursive: true })
    const files = await readdir(handlersDir)
    for (const file of files) {
      const src = join(handlersDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(handlersDestDir, file))
      }
    }
    mlclDebug(
      `[scaffold] Copied ${files.length} template handlers from ${relative(cliRoot, handlersDir)}`,
    )
  }

  // Copy API tiers.ts (template-provided subscription tier ladder).
  // Source: template/api/[src/]tiers.ts → apiPath/src/tiers.ts
  const tiersSrcFile = join(templateDir, 'api', 'src', 'tiers.ts')
  const tiersFlatFile = join(templateDir, 'api', 'tiers.ts')
  const tiersFile = existsSync(tiersSrcFile) ? tiersSrcFile : tiersFlatFile
  if (apiPath && existsSync(tiersFile)) {
    await copyFile(tiersFile, join(apiPath, 'src', 'tiers.ts'))
    mlclDebug(`[scaffold] Copied template api/tiers.ts from ${relative(cliRoot, tiersFile)}`)
  }

  // Copy API routes/ (template-provided route modules — billing, etc.).
  // Source: template/api/[src/]routes/*.ts → apiPath/src/routes/*.ts
  const routesSrcDir = join(templateDir, 'api', 'src', 'routes')
  const routesFlatDir = join(templateDir, 'api', 'routes')
  const routesDir = existsSync(routesSrcDir) ? routesSrcDir : routesFlatDir
  const routeFiles: string[] = []
  if (apiPath && existsSync(routesDir)) {
    const routesDestDir = join(apiPath, 'src', 'routes')
    await mkdir(routesDestDir, { recursive: true })
    const files = await readdir(routesDir)
    for (const file of files) {
      const src = join(routesDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(routesDestDir, file))
        routeFiles.push(file)
      }
    }
    mlclDebug(
      `[scaffold] Copied ${files.length} template routes from ${relative(cliRoot, routesDir)}`,
    )
  }

  // Copy API migrations/ (template-provided SQL for handler tables).
  // Source: template/api/migrations/*.sql → apiPath/migrations/*.sql.
  // Copy per-app server.ts override (template/api/src/server.ts) so
  // flagships can mount their own content router (handlers/index.ts) and
  // wire app-specific middleware ordering. Without this the smoke app
  // runs the generic scaffold server.ts, which has no /api/posts etc.
  const apiServer = join(templateDir, 'api', 'src', 'server.ts')
  if (apiPath && existsSync(apiServer)) {
    await copyFile(apiServer, join(apiPath, 'src', 'server.ts'))
    mlclDebug(`[scaffold] Overrode api/src/server.ts with template-specific version`)
  }

  // The base scaffold ships migrations for users / devices / payments
  // only; flagships with app-specific resource tables (accounts /
  // transactions / posts / tickets / etc.) ship their own SQL here.
  //
  // The SQL is Postgres dialect whatever the app runs, and a non-Postgres bond
  // rewrites it as it applies the file, so each copy is preceded by
  // {@link migrationDialectHeader} naming the app's database. X1 flash-m69 read
  // these files in a SQLite-bonded app and wrote its own schema the same way,
  // then had to detect the dialect itself 36 s later (the finding's +05:14 path).
  const migrationsDir = join(templateDir, 'api', 'migrations')
  if (apiPath && existsSync(migrationsDir)) {
    const migrationsDestDir = join(apiPath, 'migrations')
    await mkdir(migrationsDestDir, { recursive: true })
    const dialectHeader = migrationDialectHeader(await projectDatabasePackage(apiPath))
    const files = await readdir(migrationsDir)
    for (const file of files) {
      const src = join(migrationsDir, file)
      if (statSync(src).isFile() && file.endsWith('.sql')) {
        const sql = await readFile(src, 'utf-8')
        await writeFile(join(migrationsDestDir, file), `${dialectHeader}${sql}`)
      }
    }
    mlclDebug(`[scaffold] Copied ${files.length} template migrations`)
  }

  // Locales are not copied from the template here: the destination app's
  // locale tree is GENERATED from the bonded locale packages, and every
  // template's own tree lives at `<template>/app/src/locales/<locale>/ui.ts` —
  // one folder per locale — which the flat, `isFile()`-filtered copy this
  // used to be could not carry from ANY layout (it read `<template>/locales`,
  // a path no template has). The template's app-specific keys reach the app
  // through its `app/locales/en/ui-extras.ts.partial`, spliced into every
  // generated locale below.

  // Copy App.tsx override (replaces the scaffold default if present).
  // Same dual-path lookup as handlers/pages — `app/src/App.tsx` is canonical.
  const appTsxSrc = join(templateDir, 'app', 'src', 'App.tsx')
  const appTsxFlat = join(templateDir, 'app', 'App.tsx')
  const appTsx = existsSync(appTsxSrc) ? appTsxSrc : appTsxFlat
  if (existsSync(appTsx)) {
    await copyFile(appTsx, join(appPath, 'src', 'App.tsx'))
    mlclDebug(
      `[scaffold] Overrode App.tsx with template-specific version (${relative(cliRoot, appTsx)})`,
    )
  }

  // Copy e2e/ directory + playwright.config.ts (per-app Playwright suite).
  // Templates that ship an `e2e/` folder must also ship a self-contained
  // `playwright.config.ts` (i.e. no `../_e2e-shared/` imports) so that the
  // scaffolded copy can run `npx playwright test` directly without the
  // workspace's flagship-rollout scaffolding.
  const e2eSrcDir = join(templateDir, 'e2e')
  if (existsSync(e2eSrcDir)) {
    const e2eDestDir = join(appPath, 'e2e')
    await mkdir(e2eDestDir, { recursive: true })
    const copyTree = async (src: string, dest: string): Promise<number> => {
      let count = 0
      for (const entry of await readdir(src, { withFileTypes: true })) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)
        if (entry.isDirectory()) {
          await mkdir(destPath, { recursive: true })
          count += await copyTree(srcPath, destPath)
        } else if (entry.isFile()) {
          await copyFile(srcPath, destPath)
          count++
        }
      }
      return count
    }
    const e2eCount = await copyTree(e2eSrcDir, e2eDestDir)
    mlclDebug(`[scaffold] Copied ${e2eCount} e2e files to ${relative(cliRoot, e2eDestDir)}`)
  }
  const playwrightConfig = join(templateDir, 'playwright.config.ts')
  if (existsSync(playwrightConfig)) {
    await copyFile(playwrightConfig, join(appPath, 'playwright.config.ts'))
    mlclDebug(`[scaffold] Copied playwright.config.ts`)
  }
  // `e2e/bonds.ts` (which browser: the live preview in a sandbox, real Playwright
  // elsewhere) — the specs just copied import it through their `_helpers.ts`.
  await ensureE2EFiles(appPath)

  // Copy template-specific components (BlogLayout, Sidebar, etc.).
  const componentsSrcDir = join(templateDir, 'app', 'src', 'components')
  const componentsFlatDir = join(templateDir, 'app', 'components')
  const componentsDir = existsSync(componentsSrcDir) ? componentsSrcDir : componentsFlatDir
  if (existsSync(componentsDir)) {
    const componentsDestDir = join(appPath, 'src', 'components')
    await mkdir(componentsDestDir, { recursive: true })
    const files = await readdir(componentsDir)
    for (const file of files) {
      const src = join(componentsDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(componentsDestDir, file))
      }
    }
    mlclDebug(`[scaffold] Copied ${files.length} template-specific components`)
  }

  // Copy template-specific utility modules (e.g. httpUnpack, formatters)
  // referenced by pages/components via `../utils/*`.
  const utilsSrcDir = join(templateDir, 'app', 'src', 'utils')
  const utilsFlatDir = join(templateDir, 'app', 'utils')
  const utilsDir = existsSync(utilsSrcDir) ? utilsSrcDir : utilsFlatDir
  if (existsSync(utilsDir)) {
    const utilsDestDir = join(appPath, 'src', 'utils')
    await mkdir(utilsDestDir, { recursive: true })
    const files = await readdir(utilsDir)
    for (const file of files) {
      const src = join(utilsDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(utilsDestDir, file))
      }
    }
    mlclDebug(`[scaffold] Copied ${files.length} template-specific utils`)
  }

  // Copy template-specific shared TS types (e.g. agent-public.ts)
  // referenced by pages/components via `../types/*`.
  const typesSrcDir = join(templateDir, 'app', 'src', 'types')
  const typesFlatDir = join(templateDir, 'app', 'types')
  const typesDir = existsSync(typesSrcDir) ? typesSrcDir : typesFlatDir
  if (existsSync(typesDir)) {
    const typesDestDir = join(appPath, 'src', 'types')
    await mkdir(typesDestDir, { recursive: true })
    const files = await readdir(typesDir)
    for (const file of files) {
      const src = join(typesDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(typesDestDir, file))
      }
    }
    mlclDebug(`[scaffold] Copied ${files.length} template-specific types`)
  }

  // Copy template-specific shared library modules (e.g. demo-ticket-display.ts)
  // referenced by pages/components via `../lib/*`.
  const libSrcDir = join(templateDir, 'app', 'src', 'lib')
  const libFlatDir = join(templateDir, 'app', 'lib')
  const libDir = existsSync(libSrcDir) ? libSrcDir : libFlatDir
  if (existsSync(libDir)) {
    const libDestDir = join(appPath, 'src', 'lib')
    await mkdir(libDestDir, { recursive: true })
    const files = await readdir(libDir)
    for (const file of files) {
      const src = join(libDir, file)
      if (statSync(src).isFile()) {
        await copyFile(src, join(libDestDir, file))
      }
    }
    mlclDebug(`[scaffold] Copied ${files.length} template-specific lib files`)
  }

  // Copy app bonds override (merges with scaffold default)
  const appBonds = join(templateDir, 'app', 'bonds.ts')
  if (existsSync(appBonds)) {
    await copyFile(appBonds, join(appPath, 'src', 'bonds', 'app-bonds.ts'))
    mlclDebug(`[scaffold] Copied template app bonds`)
  }

  // Copy theme.css — prepend the self-documenting "recolor here, not the bond"
  // header so the executor that opens it to recolor sees the truth in-file.
  //
  // The palette lives at `<template>/app/src/theme.css` — the runtime layout
  // every template in the fleet ships (the destination mirrors it at
  // `<app>/src/theme.css`). Reading the bare `<template>/theme.css` (as this
  // used to) matched NO template, so a build layered on a template silently
  // kept the default palette the create flow had already written.
  const themeCss = join(templateDir, 'app', 'src', 'theme.css')
  if (existsSync(themeCss)) {
    const themeCssContent = await readFile(themeCss, 'utf-8')
    // In-place rewrite of a file the create flow already wrote — guarded like
    // every other one, so a failed write leaves the palette as it was instead
    // of a truncated theme.css.
    await writeGuarded(
      join(appPath, 'src', 'theme.css'),
      withHeader(themeCssContent, THEME_CSS_HEADER_TEMPLATE),
    )
  }

  // Copy DESIGN.md (now lives inside the app/ tree — it describes the app,
  // not the api). Skip-if-exists so curated content is preserved on
  // re-scaffold; flows naturally to user sandboxes as a starting point
  // for their own brand iteration.
  const designMd = join(templateDir, 'app', 'DESIGN.md')
  if (existsSync(designMd)) {
    const dest = join(appPath, 'DESIGN.md')
    if (!existsSync(dest)) {
      await copyFile(designMd, dest)
    }
  }

  // Copy template-specific runtime ClassMap tokens + ambient declarations.
  // These are produced by the `polish-v2` pipeline (see mlcl/templates/apps/<app>/app/scripts/build-visual-classmap.mjs)
  // and combined with the stock tailwind classMap via bonds/app-ui-tailwind.ts.
  const generatedClassMap = join(templateDir, 'app', 'generatedVisualClassMap.ts')
  const flagshipUiAugment = join(templateDir, 'app', 'flagship-ui-augment.d.ts')
  let classMapCopied = false
  if (existsSync(generatedClassMap)) {
    await copyFile(generatedClassMap, join(appPath, 'src', 'generatedVisualClassMap.ts'))
    classMapCopied = true
  }
  if (existsSync(flagshipUiAugment)) {
    await copyFile(flagshipUiAugment, join(appPath, 'src', 'flagship-ui-augment.d.ts'))
  }

  // Append per-app polish-v2 CSS (Stitch palette, Tailwind safelist, custom CSS classes)
  // to the scaffold-generated index.css. Without this, generated apps compile but visually
  // diverge from reference designs (no Stitch fonts/colors, dynamic classes purged).
  // Source-of-truth lives in `mlcl/templates/apps/<app>/app/index-polish.css`,
  // re-extracted from reference via `scripts/sync-polish-css.mjs` after polish runs.
  const polishCss = join(templateDir, 'app', 'index-polish.css')
  if (existsSync(polishCss)) {
    const indexCssPath = join(appPath, 'src', 'index.css')
    const baseCss = existsSync(indexCssPath) ? await readFile(indexCssPath, 'utf-8') : ''
    const polishContent = await readFile(polishCss, 'utf-8')
    let augmented = baseCss
    if (classMapCopied && !augmented.includes('./generatedVisualClassMap.ts')) {
      // Inject @source for the runtime ClassMap tokens so Tailwind scans them.
      augmented = augmented.replace(
        /(@plugin\s+"@tailwindcss\/typography";\s*\n)/,
        `$1\n@source "./generatedVisualClassMap.ts";\n`,
      )
    }
    await writeGuarded(indexCssPath, `${augmented.trimEnd()}\n\n${polishContent.trimEnd()}\n`)
    mlclDebug(`[scaffold] Appended polish-v2 CSS (${polishContent.length} bytes) to src/index.css`)
  }

  // Inject per-app design-resources block (the Material Symbols utility-class
  // variants + any helper styles) into the scaffold-generated index.html's
  // mol:design-resources slot. Fonts themselves are LOCAL — served from the
  // mol:fonts @font-face block (generateFontHtml / the copied template), never a
  // Google Fonts <link>; this slot must NEVER contain external font links or
  // @import url(fonts.googleapis…).
  // Source-of-truth lives in `mlcl/templates/apps/<app>/app/index-design-resources.html`.
  const designResourcesHtml = join(templateDir, 'app', 'index-design-resources.html')
  if (existsSync(designResourcesHtml)) {
    const indexHtmlPath = join(appPath, 'index.html')
    if (existsSync(indexHtmlPath)) {
      const indexHtml = await readFile(indexHtmlPath, 'utf-8')
      const block = (await readFile(designResourcesHtml, 'utf-8')).trim()
      const re = /<!--\s*mol:design-resources\s*-->[\s\S]*?<!--\s*\/mol:design-resources\s*-->/
      if (re.test(indexHtml)) {
        // `block` is the template's own index-design-resources.html, i.e. DATA
        // (hand-edited CSS/markup): a replacement STRING reads `$&` as the whole
        // match, so a `$` sequence in the block spliced the placeholder comment
        // into the injected CSS. The replacement goes through a FUNCTION, like
        // the branding-driven rewrites above.
        const replaced = indexHtml.replace(
          re,
          () => `<!-- mol:design-resources -->\n    ${block}\n    <!-- /mol:design-resources -->`,
        )
        await writeGuarded(indexHtmlPath, replaced)
        mlclDebug(
          `[scaffold] Injected design-resources HTML (${block.length} bytes) into index.html`,
        )
      } else {
        mlclDebug(
          `[scaffold] WARNING: index.html missing <!-- mol:design-resources --> placeholder; cannot inject fonts`,
        )
      }
    }
  }

  // Inject polish-v2 i18n extras into EVERY scaffold-generated locale's
  // `src/locales/<locale>/ui.ts` file. The polish pipeline adds new English
  // keys (e.g. 'postListFilterBar.allWithCount': 'All ({{count}})') consumed
  // by polished components; without these, generated apps fall back to short
  // `defaultValue` text and visually diverge from the reference.
  //
  // Source-of-truth lives in `mlcl/templates/apps/<app>/app/locales/en/ui-extras.ts.partial`
  // (re-extracted from reference via `scripts/sync-polish-locale-extras.mjs`).
  // Polish never translates these keys, so the same English values are spliced
  // into ALL locale ui.ts files (matching the reference flagship apps).
  const enExtrasPath = join(templateDir, 'app', 'locales', 'en', 'ui-extras.ts.partial')
  if (existsSync(enExtrasPath)) {
    const partialContent = (await readFile(enExtrasPath, 'utf-8')).trimEnd()
    if (partialContent) {
      const generatedLocalesDir = join(appPath, 'src', 'locales')
      if (existsSync(generatedLocalesDir)) {
        const locales = await readdir(generatedLocalesDir)
        for (const locale of locales) {
          const targetUi = join(generatedLocalesDir, locale, 'ui.ts')
          if (!existsSync(targetUi)) continue
          const ui = await readFile(targetUi, 'utf-8')
          // Avoid double-injection when re-running scaffolder against an existing tree.
          if (ui.includes(partialContent)) continue
          // Splice extras in just before the closing `}` of `export const ui = {`.
          const closeIdx = ui.lastIndexOf('}')
          if (closeIdx < 0) {
            mlclDebug(
              `[scaffold] WARNING: cannot find closing } in ${targetUi}; skipping locale extras`,
            )
            continue
          }
          const before = ui.slice(0, closeIdx).replace(/\s+$/, '')
          const after = ui.slice(closeIdx)
          const merged = `${before}\n${partialContent}\n${after}`
          await writeGuarded(targetUi, merged)
        }
        mlclDebug(
          `[scaffold] Injected polish-v2 i18n extras (${partialContent.length} bytes) into ${locales.length} locale ui.ts files`,
        )
      }
    }
  }

  // This path copies the template's handlers (its seed module among them), so
  // it needs the same demo-content notices the `--template` fast path stamps.
  await stampDemoContentNotices(appPath, apiPath)
  await ensureScratchDir(dirname(appPath))
}

/**
 * Apply template overrides that must run AFTER bond injection (which generates
 * `src/bonds/*.ts` files and would otherwise overwrite our customizations).
 *
 * Looks for bond overrides in TWO places:
 *  1. `app/src/bonds/` — modern, canonical layout matching the symlink
 *     contract in CLAUDE.md "Flagship apps: mlcl/templates is the source
 *     of truth". Files here include `http-default.ts` (sets `baseURL: '/api'`
 *     so `usePricingTiers` etc. don't crash) and `index.ts` (the wired
 *     `setupProviders()`).
 *  2. `app/bonds/` — legacy flat layout (`app-ui-tailwind.ts` for blog/crm
 *     wrapping the stock Tailwind classMap with `applyGeneratedVisualTokens`).
 *
 * Modern `app/src/bonds/` wins on filename collision because it is applied
 * second.
 */
export async function applyTemplatePostInjectOverrides(
  templateName: string,
  appPath: string,
  cliRoot: string,
): Promise<void> {
  const templateDir = join(cliRoot, 'templates', 'apps', templateName)
  const bondsDestDir = join(appPath, 'src', 'bonds')
  let totalCount = 0
  for (const overrideDir of [
    join(templateDir, 'app', 'bonds'),
    join(templateDir, 'app', 'src', 'bonds'),
  ]) {
    if (!existsSync(overrideDir)) continue
    await mkdir(bondsDestDir, { recursive: true })
    const files = await readdir(overrideDir)
    for (const file of files) {
      const src = join(overrideDir, file)
      if (statSync(src).isFile()) {
        const dest = join(bondsDestDir, file)
        // The theme bond is the #1 mis-edit target for recoloring: in a template
        // app theme.css shadows it, so colors set here are dead. Stamp a redirect
        // header so the executor that opens it is sent to theme.css.
        //
        // Guarded either way: the destination PRE-EXISTS (the injector generated
        // it moments ago, and a re-apply runs over an even older copy), so a
        // write that fails mid-flight must restore those bytes, not truncate a
        // bond file the app imports at boot.
        if (file === 'app-theme-css-variables.ts') {
          await writeGuarded(
            dest,
            withHeader(await readFile(src, 'utf-8'), THEME_BOND_REDIRECT_HEADER),
          )
        } else {
          await writeGuarded(dest, await readFile(src))
        }
        totalCount++
      }
    }
  }
  if (totalCount > 0) {
    mlclDebug(
      `[scaffold] Re-applied ${totalCount} bonds override(s) post-inject for ${templateName}`,
    )
  }
}

/**
 * Wire template-supplied API handlers and route modules into the generated
 * `App/router.ts` after the injector has run.
 *
 * The injector generates a stub `App/router.ts` populated only from molecule
 * resource packages (User, Device, etc.). Templates can ship additional
 * Express routers — `api/handlers/index.ts` for the app's CRUD resources and
 * `api/routes/*.ts` for cross-cutting concerns like billing — but unless we
 * mount them here they would be orphaned in the generated project.
 *
 * @param apiPath - Path to the scaffolded API project (e.g. `<projectPath>/api`).
 */
export async function wireTemplateApiRouters(apiPath: string): Promise<void> {
  const apiRouterPath = join(apiPath, 'src', 'App', 'router.ts')
  if (!existsSync(apiRouterPath)) return

  const handlersIndex = join(apiPath, 'src', 'handlers', 'index.ts')
  const hasHandlers = existsSync(handlersIndex)

  const routesDir = join(apiPath, 'src', 'routes')
  let routeFiles: string[] = []
  if (existsSync(routesDir)) {
    routeFiles = (await readdir(routesDir))
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
      .sort()
  }

  if (!hasHandlers && routeFiles.length === 0) return

  let routerContent = await readFile(apiRouterPath, 'utf-8')
  const importLines: string[] = []
  const mountLines: string[] = []

  if (hasHandlers && !routerContent.includes("from '../handlers/index.js'")) {
    importLines.push(`import templateHandlers from '../handlers/index.js'`)
    mountLines.push(`router.use(templateHandlers)`)
  }
  for (const file of routeFiles) {
    const base = file.replace(/\.ts$/, '')
    const importIdent = `${base.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())}Routes`
    const importPath = `../routes/${base}.js`
    if (!routerContent.includes(`from '${importPath}'`)) {
      importLines.push(`import ${importIdent} from '${importPath}'`)
      mountLines.push(`router.use('/${base}', ${importIdent})`)
    }
  }

  if (importLines.length === 0) return

  // Insert imports after the last existing `import` line.
  const lines = routerContent.split('\n')
  let lastImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('import ')) lastImportIdx = i
  }
  if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, ...importLines)
    routerContent = lines.join('\n')
  } else {
    routerContent = importLines.join('\n') + '\n\n' + routerContent
  }

  if (!routerContent.endsWith('\n')) routerContent += '\n'
  routerContent += '\n' + mountLines.join('\n') + '\n'

  // Guarded like every in-place rewrite in this module: the router PRE-EXISTS
  // (this step only ever runs to modify it), and a write that fails mid-flight
  // would otherwise leave a truncated `App/router.ts` — the file every route in
  // the API resolves through, so the scaffold's failure also leaves a project
  // that no longer compiles or boots.
  await writeGuarded(apiRouterPath, routerContent)
  mlclDebug(
    `[scaffold] Wired template handlers/routes into App/router.ts (${mountLines.length} mounts)`,
  )
}

/**
 * Ensure a CUSTOM (non-template) API build ships the same `handlers/index.ts`
 * aggregator that every flagship template scaffolds, mounted on `App/router.ts`.
 *
 * Flagship templates copy a `src/handlers/index.ts` (a default-exported Express
 * `Router`) and `wireTemplateApiRouters` mounts it. A custom build's base
 * `router.ts.tpl` had no `handlers/` directory at all — resource routes are
 * injected inline — so the two scaffold shapes diverged. The AI executor learns
 * the "register feature endpoints in `handlers/index.ts`" pattern from the
 * scaffolded AGENTS.md + api-patterns skill + every template, so on a custom
 * build it hit a `read_file: handlers/index.ts: No such file` miss every time.
 * Emitting the same empty anchor makes custom == template structurally.
 *
 * Idempotent and safe to call on any API build: a no-op when `handlers/index.ts`
 * already exists (templates) or `App/router.ts` already imports it. Distinct
 * identifier (`handlers`, not `templateHandlers`) so it never collides with a
 * `wireTemplateApiRouters` mount.
 *
 * @param apiPath - The API project root (holds `src/App/router.ts`).
 */
export async function ensureBaseHandlersIndex(apiPath: string): Promise<void> {
  const apiRouterPath = join(apiPath, 'src', 'App', 'router.ts')
  if (!existsSync(apiRouterPath)) return

  const handlersDir = join(apiPath, 'src', 'handlers')
  const handlersIndex = join(handlersDir, 'index.ts')
  if (!existsSync(handlersIndex)) {
    await mkdir(handlersDir, { recursive: true })
    // Guarded: on a failed write the half-written aggregator is removed — it is
    // a NEW file here, but a partial one is a syntax error in the project's
    // test/lint surface, and the guard's rm-on-created-file failure path is
    // exactly for that.
    await writeGuarded(
      handlersIndex,
      `import { Router } from 'express'\n\n` +
        `/**\n` +
        ` * Feature handler aggregator. Every router below is mounted at the prefix on its\n` +
        ` * \`router.use('/x', router)\` line, and the paths inside it are RELATIVE to that mount:\n` +
        ` * \`router.post('/users', …)\` in a router mounted at \`/users\` answers at \`/users/users\`,\n` +
        ` * not \`/users\` — declare \`router.post('/', …)\` there, or change its mount line here.\n` +
        ` * Everything here is served under \`/api\`: a route the client or a suite calls at\n` +
        ` * \`/api/users\` is declared as \`/users\`. Do not add a prefix of your own.\n` +
        ` *\n` +
        ` * Add a per-feature router here as the app grows:\n` +
        ` *   import widgets from './widgets.js'\n` +
        ` *   router.use('/widgets', widgets)\n` +
        ` */\n` +
        `const router = Router()\n\n` +
        `export default router\n`,
    )
  }

  let routerContent = await readFile(apiRouterPath, 'utf-8')
  if (routerContent.includes(`from '../handlers/index.js'`)) return

  // Insert the import in simple-import-sort order (mirrors wireTemplateApiRouters'
  // "after the last import" only when no same-directory import exists): the
  // scaffolded eslint config ships simple-import-sort, and within the relative
  // group `../handlers/index.js` sorts BEFORE `./Resource/...` (`.` < `/`), so
  // appending after the last `./…` import emits a file that fails its own lint.
  const importLine = `import handlers from '../handlers/index.js'`
  const lines = routerContent.split('\n')
  let lastImportIdx = -1
  let firstSameDirImportIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]?.startsWith('import ')) {
      lastImportIdx = i
      if (firstSameDirImportIdx < 0 && /from '\.\//.test(lines[i] ?? '')) {
        firstSameDirImportIdx = i
      }
    }
  }
  if (firstSameDirImportIdx >= 0) {
    lines.splice(firstSameDirImportIdx, 0, importLine)
    routerContent = lines.join('\n')
  } else if (lastImportIdx >= 0) {
    lines.splice(lastImportIdx + 1, 0, importLine)
    routerContent = lines.join('\n')
  } else {
    routerContent = `${importLine}\n\n${routerContent}`
  }

  // The app's own routes are mounted BEFORE the built-in resource routes:
  // Express answers with the first match, so mounted last, a handler for a path
  // a built-in already has (a spec's own `POST /users` signup) never ran and the
  // built-in answered in its place. Mounted first, the app's route wins on a
  // conflict, and every request it does not handle falls through to the
  // built-ins as before. It goes after the router-wide middleware
  // (`router.use(…verifyMiddleware())`) so handlers still see the session.
  const mount =
    `// The app's own routes come first: Express answers with the first match, so a route\n` +
    `// in ../handlers takes precedence over a built-in route below at the same path.\n` +
    `router.use(handlers)\n`
  const routeLines = routerContent.split('\n')
  const firstRoute = routeLines.findIndex((line) =>
    /^router\.(get|post|put|patch|delete|all)\(/.test(line),
  )
  if (firstRoute >= 0) {
    routeLines.splice(firstRoute, 0, ...mount.trimEnd().split('\n'), '')
    routerContent = routeLines.join('\n')
    if (!routerContent.endsWith('\n')) routerContent += '\n'
  } else {
    if (!routerContent.endsWith('\n')) routerContent += '\n'
    routerContent += `\n${mount}`
  }

  // Guarded, same policy as wireTemplateApiRouters above: the router pre-exists,
  // and a failed write must not leave a truncated route table behind.
  await writeGuarded(apiRouterPath, routerContent)
  mlclDebug(`[scaffold] Wired base handlers/index.ts into App/router.ts`)
}

/**
 * Optional ClassMap *variant* bonds whose Tailwind utility classes live ONLY in
 * their own compiled `dist` — so unless that dist is `@source`-scanned, Tailwind 4
 * never generates their classes and adopting the bond yields zero effect. The base
 * CSS template already scans `app-ui-tailwind` + `app-styling-tailwind` + the
 * framework UI package; this maps each such variant bond to the extra package whose
 * dist must additionally be scanned when the bond is selected.
 */
const VARIANT_CLASSMAP_SOURCE_SCANS: Record<string, string> = {
  // Liquid-glass ClassMap: its glass/backdrop-blur utilities are only in its dist.
  '@molecule/app-ui-tailwind-glass': '@molecule/app-ui-tailwind-glass',
}

/**
 * Build the extra Tailwind `@source` scan line(s) to inject into the generated
 * `index.css` for any selected ClassMap variant bond (e.g.
 * `@molecule/app-ui-tailwind-glass`). Matches the exact relative-path + `/dist`
 * glob shape of the static `@source` lines in `index-tailwind.css.tpl`.
 *
 * Returns '' when no variant bond is selected (byte-identical output to before),
 * or a leading-newline `@source "...";` line per selected variant bond — appended
 * right after the framework `@source` line via the `{{EXTRA_UI_SOURCE_SCANS}}`
 * placeholder.
 */
export function buildExtraUiSourceScans(selectedPackages: string[], nmPrefix: string): string {
  const selected = new Set(selectedPackages)
  const scans: string[] = []
  for (const [bond, scanPkg] of Object.entries(VARIANT_CLASSMAP_SOURCE_SCANS)) {
    if (selected.has(bond)) {
      scans.push(`@source "${nmPrefix}/node_modules/${scanPkg}/dist";`)
    }
  }
  return scans.length > 0 ? '\n' + scans.join('\n') : ''
}

/**
 * Create an App project skeleton (Vite frontend).
 *
 * `fontAssetMode` is caller-declared: the default preserves public font copies;
 * module mode requires Vite index.html and persists that choice for asset sync.
 */
export async function createAppProject(
  projectPath: string,
  projectName: string,
  framework: string,
  _isWorkspace = false,
  fontLinks = '',
  extraVars: Record<string, string> = {},
  selectedPackages: string[] = [],
  buildTooling?: BuildTooling,
  npmOverrides: Record<string, string> = {},
  fontAssetMode: 'copy' | 'module' = 'copy',
): Promise<void> {
  mlclDebug(`[scaffold] createAppProject: ${projectPath} (framework: ${framework})`)

  // React Native uses Metro (not Vite/npm-resolved node deps) and socket.io-client
  // there uses the platform WebSocket, not the Node-only `ws` package, so npm
  // `overrides` for `ws` are inapplicable — not forwarded to the RN scaffolder.
  if (framework === 'react-native') {
    if (fontAssetMode === 'module') {
      throw new Error('Module font assets require a caller-configured Vite index.html project')
    }
    await createReactNativeAppProject(
      projectPath,
      projectName,
      extraVars,
      selectedPackages,
      buildTooling,
    )
    return
  }

  // Framework-specific config from registry
  const appFrameworks = loadAppFrameworks()
  const fwConfig = appFrameworks[framework] ?? { dependencies: {}, devDependencies: {} }
  if (fontAssetMode === 'module' && (!fwConfig.vitePlugin || fwConfig.htmlTemplate)) {
    throw new Error('Module font assets require a caller-configured Vite index.html project')
  }
  const toolchain = loadToolchain()

  // Framework-specific paths derived from registry config
  const sharedSubdir = fwConfig.sharedCodeDir // e.g. "lib" for SvelteKit
  const sharedDir = sharedSubdir ? join(projectPath, 'src', sharedSubdir) : join(projectPath, 'src')
  const ext = fwConfig.fileExtension ?? 'tsx'
  // A NAME from the registry (`schema.ts`: "Static assets directory name"), resolved
  // against this project here. Everything below joins it with `projectPath`, EXCEPT
  // the preview-bridge injectors, which take a directory: those get
  // `publicDirPath` (see {@link previewBridgeAssetDir} for what a bare name cost).
  const publicDir = fwConfig.publicDir ?? 'public'
  const publicDirPath = join(projectPath, publicDir)
  const htmlFile = fwConfig.htmlTemplate ?? 'index.html'
  const gitignoreTpl = fwConfig.gitignoreTemplate ?? 'app/shared/gitignore.tpl'
  const brandingImportPath = sharedSubdir
    ? `./src/${sharedSubdir}/branding.js`
    : './src/branding.js'
  const brandingPath = sharedSubdir ? `src/${sharedSubdir}/branding.ts` : 'src/branding.ts'
  const formatGlob = `'src/**/*.{ts,${ext}}'`

  await mkdir(projectPath, { recursive: true })
  await mkdir(join(projectPath, 'src'), { recursive: true })
  await mkdir(join(sharedDir, 'bonds'), { recursive: true })
  await mkdir(join(projectPath, publicDir), { recursive: true })
  await mkdir(join(projectPath, publicDir, 'icons'), { recursive: true })

  // Read single-source logo and extract inner SVG content for embedding
  const logoSvg = await loadTemplate('app/shared/logo.svg.tpl')
  const logoInnerMatch = logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)
  const logoContent = logoInnerMatch ? logoInnerMatch[1] : ''

  // Copy source logo (the one file developers replace)
  await writeFile(join(projectPath, publicDir, 'logo.svg'), logoSvg)

  // Generate PWA icons (logo on white background)
  for (const size of [192, 512]) {
    const padding = Math.round(size * 0.15)
    await writeFile(
      join(projectPath, publicDir, 'icons', `icon-${size}.svg`),
      await loadTemplate('app/shared/icon.svg.tpl', {
        SIZE: String(size),
        RADIUS: String(padding),
        PADDING: String(padding),
        LOGO_SIZE: String(size - padding * 2),
        LOGO_CONTENT: logoContent,
      }),
    )
  }

  // Generate Apple splash screens (logo centered on white)
  const splashSizes: [number, number][] = [
    [2048, 2732],
    [1668, 2224],
    [1536, 2048],
    [1125, 2436],
    [1242, 2208],
    [750, 1334],
    [640, 1136],
  ]
  await Promise.all(
    splashSizes.map(([w, h]) => {
      const logoSize = Math.round(Math.min(w, h) * 0.25)
      return loadTemplate('app/shared/splash.svg.tpl', {
        WIDTH: String(w),
        HEIGHT: String(h),
        LOGO_SIZE: String(logoSize),
        LOGO_X: String(Math.round((w - logoSize) / 2)),
        LOGO_Y: String(Math.round((h - logoSize) / 2)),
        LOGO_CONTENT: logoContent,
      }).then((content) =>
        writeFile(join(projectPath, publicDir, 'icons', `splash-${w}x${h}.svg`), content),
      )
    }),
  )

  // Generate favicon (copy of logo) and social preview image
  await writeFile(join(projectPath, publicDir, 'favicon.svg'), logoSvg)
  await writeFile(
    join(projectPath, publicDir, 'og-image.svg'),
    await loadTemplate('app/shared/og-image.svg.tpl', {
      PROJECT_NAME: projectName,
      LOGO_CONTENT: logoContent,
    }),
  )

  // Copy generate-icons script (regenerates all 11 SVGs from logo.svg)
  await mkdir(join(projectPath, 'scripts'), { recursive: true })
  await writeFile(
    join(projectPath, 'scripts', 'generate-icons.mjs'),
    await loadTemplate('app/shared/generate-icons.mjs.tpl', {
      BRANDING_PATH: brandingPath,
      PUBLIC_DIR: publicDir,
      HTML_PATH: htmlFile === 'app.html' ? `src/${htmlFile}` : htmlFile,
    }),
  )

  // (ext, formatGlob, fwConfig, toolchain defined above)

  const packageJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    type: 'module',
    scripts: {
      dev: 'vite',
      build: fwConfig.buildScript ?? 'tsc --noEmit && vite build',
      preview: 'vite preview',
      'generate-icons': 'node scripts/generate-icons.mjs',
      test: 'vitest run',
      typecheck: 'tsc --noEmit',
      lint: 'eslint src/',
      'lint:fix': 'eslint src/ --fix',
      format: `prettier --write ${formatGlob}`,
      'format:check': `prettier --check ${formatGlob}`,
    },
    dependencies: {
      ...(fwConfig.dependencies ?? {}),
    },
    devDependencies: {
      ...(buildTooling?.devDependencies ?? {}),
      ...toolchain.shared,
      ...toolchain.app,
      ...(fwConfig.devDependencies ?? {}),
    },
    // For an app-only project this package.json IS the install root, so any
    // `overrides` a selected bond requires go here. As a full-stack sub-project
    // the caller passes none — the monorepo root carries them workspace-wide.
    ...(Object.keys(npmOverrides).length > 0 ? { overrides: npmOverrides } : {}),
    molecule: {
      projectType: 'app',
      framework,
      // Persist the caller's asset contract; inject/swap must not infer it from
      // framework dependencies or recreate public copies on a later sync.
      ...(fontAssetMode === 'module' ? { fontAssetMode } : {}),
    },
  }

  await writeFile(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n')
  // The e2e runner + bonds the vite config's preview plugin file imports (one place
  // for custom apps; templates get the same through copyTemplateInstance).
  await ensureE2EManifest(projectPath)
  await writeFile(join(projectPath, '.npmrc'), await loadTemplate('shared/npmrc.tpl'))

  // tsconfig.json (framework-specific)
  const tsconfigBase = {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    lib: ['DOM', 'DOM.Iterable', 'ES2022'],
  }

  // Use tsconfigOverride from registry if provided (e.g. SvelteKit uses extends),
  // otherwise merge base compilerOptions with framework-specific tsconfig overrides.
  const tsconfig = fwConfig.tsconfigOverride ?? {
    compilerOptions: { ...tsconfigBase, ...(fwConfig.tsconfig ?? {}) },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist'],
  }

  await writeFile(join(projectPath, 'tsconfig.json'), formatJson(tsconfig))

  // vite.config.ts (framework-specific, from registry)
  mlclDebug(`[scaffold] Generating vite.config.ts + package.json`)
  const viteImport = fwConfig.vitePlugin?.import ?? ''
  const vitePlugin = fwConfig.vitePlugin?.usage ?? ''
  const plugins = [vitePlugin, buildTooling?.vitePlugin?.usage, 'VitePWA(pwaOptions)']
    .filter(Boolean)
    .join(', ')

  const extraConfig = fwConfig.viteExtraConfig ?? ''

  await writeFile(
    join(projectPath, 'vite.config.ts'),
    await loadTemplate('app/shared/vite.config.ts.tpl', {
      TAILWIND_IMPORT: buildTooling?.vitePlugin?.import
        ? buildTooling.vitePlugin.import + '\n'
        : '',
      VITE_PLUGIN_IMPORT: viteImport ? viteImport + '\n' : '',
      VITE_PLUGINS: plugins,
      BRANDING_IMPORT: brandingImportPath,
      RESOLVE_EXTENSIONS: extraConfig ? `\n  ${extraConfig}` : '',
    }),
  )

  // The vite.config.ts above imports `./vite-preview-bridge-plugin.js`; write that
  // companion plugin so a production build (`vite build`) STRIPS the dev-only
  // molecule preview/diagnostics bridge from index.html. The bridge posts
  // `molecule:*` runtime diagnostics to `window.parent` with a wildcard target
  // origin for the IDE's live preview — it must never ship to a deployed app that
  // could be framed cross-origin. Dev (`vite`) keeps it; only the build strips it.
  await writeFile(
    join(projectPath, 'vite-preview-bridge-plugin.ts'),
    await loadTemplate('app/shared/vite-preview-bridge-plugin.ts.tpl'),
  )

  // index.html / app.html
  const htmlVars = {
    PROJECT_NAME: projectName,
    FONT_LINKS: fontLinks,
    APP_DESCRIPTION: 'Built with Molecule.dev',
    BRAND_COLOR: '#4070e0',
  }
  if (htmlFile === 'app.html') {
    // SvelteKit: app.html in src/ + svelte.config.js
    await writeFile(
      join(projectPath, 'src', htmlFile),
      await loadTemplate('app/shared/app.html.tpl', htmlVars),
    )
    await writeFile(
      join(projectPath, 'svelte.config.js'),
      await loadTemplate('app/shared/svelte.config.js.tpl'),
    )
  } else {
    // Standard Vite: index.html at project root
    await writeFile(
      join(projectPath, htmlFile),
      await loadTemplate('app/shared/index.html.tpl', {
        ...htmlVars,
        MAIN_ENTRY: `/src/main.${ext}`,
        ROOT_ELEMENT: fwConfig.htmlRootElement ?? '<div id="root"></div>',
      }),
    )
  }

  // Inject the molecule:navigate sender (PV2 URL bar + PV3 Back/Forward) into the
  // freshly written HTML entry. SvelteKit's app.html lives under src/; everything
  // else is index.html at the project root. Idempotent — see injectPreviewNavBridge.
  const htmlEntryPath =
    htmlFile === 'app.html' ? join(projectPath, 'src', htmlFile) : join(projectPath, htmlFile)
  await injectPreviewNavBridge(htmlEntryPath, publicDirPath)

  // Inject the snapshot + self-healing-readiness bridge (P2-16 blurred last-good
  // frame + P2-15 stuck-overlay self-heal) right after the nav bridge, into the
  // same freshly written HTML entry. Idempotent — see injectPreviewSnapshotBridge.
  await injectPreviewSnapshotBridge(htmlEntryPath, publicDirPath)

  // Inject the runtime-failure-detection bridge (heartbeat → freeze detection,
  // runtime-error forwarding, blank-render signal). This is a CUSTOM build, so there
  // is no baked sender — this injection is its ONLY runtime detection. Idempotent.
  await injectPreviewRuntimeBridge(htmlEntryPath, publicDirPath)

  // Inject the live-preview control bridge (Synthase reads/clicks the preview UI to
  // verify a feature end-to-end). This is a CUSTOM build with no proxy bundle, so this
  // injection is its ONLY interaction channel. Idempotent — see injectPreviewInteractBridge.
  await injectPreviewInteractBridge(htmlEntryPath, publicDirPath)

  // Move the baked liveness bridge out of the freshly written entry (13 KB of it)
  // into the app's static directory. Idempotent — see injectPreviewLivenessBridge.
  await injectPreviewLivenessBridge(htmlEntryPath, publicDirPath)

  // Framework-specific entry point and App component (from templates)
  await copyTemplateFiles(projectPath, framework, projectName, extraVars)

  // Replace the default Molecule glyph at public/logo.svg with a deterministic
  // per-app glyph tinted with the brand color from branding.ts. Skips silently
  // if the project ships a custom (non-default) logo. See logo-injector.ts.
  try {
    const brandColor = readBrandColorFromBranding(projectPath, sharedSubdir) ?? '#4070e0'
    const result = await injectLogo({
      appPath: projectPath,
      appName: projectName,
      brandColor,
      publicDir,
    })
    if (result.written) {
      mlclDebug(`[scaffold] Injected logo (glyph=${result.glyph}, color=${brandColor})`)
    }
  } catch (err) {
    mlclDebug(`[scaffold] Logo injection skipped: ${(err as Error).message}`)
  }

  // Placeholder bonds/index.ts (SvelteKit uses src/lib/bonds/)
  await writeFile(
    join(sharedDir, 'bonds', 'index.ts'),
    await loadTemplate('app/shared/bonds-index.ts.tpl'),
  )

  // Vite + PWA type declarations + framework-specific module declarations (from registry)
  const extraDecl = fwConfig.typeDeclarations ? '\n' + fwConfig.typeDeclarations : ''
  await writeFile(
    join(projectPath, 'src', 'vite-env.d.ts'),
    await loadTemplate('app/shared/vite-env.d.ts.tpl', { EXTRA_TYPE_DECLARATIONS: extraDecl }),
  )

  // CSS entry point — conditionally include styling provider CSS
  const nmPrefix = resolveNmPrefix(projectPath)
  mlclDebug(`[scaffold] resolveNmPrefix(${projectPath}) → "${nmPrefix}"`)
  const baseCss = await loadTemplate('app/shared/index.css.tpl')
  if (buildTooling?.cssTemplate) {
    mlclDebug(
      `[scaffold] CSS template: ${buildTooling.cssTemplate} (framework: ${fwConfig.uiFramework ?? framework})`,
    )
    const stylingCss = await loadTemplate(buildTooling.cssTemplate, {
      NM_PREFIX: nmPrefix,
      FRAMEWORK: fwConfig.uiFramework ?? framework,
      // Append @source scan(s) for any selected ClassMap variant bond (e.g.
      // app-ui-tailwind-glass) whose utilities live only in its own dist —
      // without this, adopting the bond generates zero of its classes.
      EXTRA_UI_SOURCE_SCANS: buildExtraUiSourceScans(selectedPackages, nmPrefix),
    })
    mlclDebug(
      `[scaffold] Writing CSS (${stylingCss.length} bytes) → ${join(projectPath, 'src', 'index.css')}`,
    )
    await writeFile(join(projectPath, 'src', 'index.css'), stylingCss)
  } else {
    mlclDebug(`[scaffold] No CSS template — using base CSS`)
    await writeFile(join(projectPath, 'src', 'index.css'), baseCss)
  }

  // Create the default theme.css (template override replaces this if provided).
  // The self-documenting header tells the executor this is the recolor file and
  // that, while empty, colors come from the theme bond.
  await writeFile(
    join(projectPath, 'src', 'theme.css'),
    THEME_CSS_HEADER_CUSTOM + '\n/* App-specific theme overrides — see DESIGN.md */\n',
  )

  // Shared config files
  await writeFile(
    join(projectPath, 'eslint.config.js'),
    await loadTemplate('shared/eslint.config.js.tpl'),
  )
  await writeFile(
    join(projectPath, '.prettierrc'),
    await loadTemplate('app/shared/prettierrc.json.tpl'),
  )
  await writeFile(
    join(projectPath, '.prettierignore'),
    await loadTemplate('app/shared/prettierignore.tpl'),
  )
  await writeFile(join(projectPath, '.editorconfig'), await loadTemplate('shared/editorconfig.tpl'))

  await writeFile(join(projectPath, '.gitignore'), await loadTemplate(gitignoreTpl))
}

/**
 * Copy template files for app projects (framework-specific entry point, etc.).
 */
export async function copyTemplateFiles(
  projectPath: string,
  framework: string,
  projectName: string,
  extraVars: Record<string, string> = {},
): Promise<void> {
  const templatesDir = join(getTemplatesDir(), 'app')
  // Copy shared config.ts (sharedCodeDir from registry determines subdirectory)
  const configContent = await readFile(join(templatesDir, 'shared', 'config.ts.tpl'), 'utf-8')
  const appFrameworks = loadAppFrameworks()
  const fwCfg = appFrameworks[framework] ?? {}
  const fwPublicDir = fwCfg.publicDir ?? 'public'

  const vars: Record<string, string> = {
    PROJECT_NAME: projectName,
    OAUTH_PROVIDERS: '',
    PUBLIC_DIR: fwPublicDir,
    ...extraVars,
  }
  const configSubdir = fwCfg.sharedCodeDir
  const configDir = configSubdir ? join(projectPath, 'src', configSubdir) : join(projectPath, 'src')
  await mkdir(configDir, { recursive: true })
  await writeFile(join(configDir, 'config.ts'), processTemplate(configContent, vars))

  // Copy shared branding.ts (centralized branding configuration). Prepend the
  // self-doc header so this file announces it's the single brand source — the
  // same header the flagship `--template` path stamps in copyTemplateInstance.
  const brandingContent = await readFile(join(templatesDir, 'shared', 'branding.ts.tpl'), 'utf-8')
  await writeFile(
    join(configDir, 'branding.ts'),
    withHeader(processTemplate(brandingContent, vars), BRANDING_HEADER),
  )

  // Copy shared pwa.ts (SW registration + update banner)
  const pwaContent = await readFile(join(templatesDir, 'shared', 'pwa.ts.tpl'), 'utf-8')
  await writeFile(
    join(configDir, 'pwa.ts'),
    sortImportStatements(processTemplate(pwaContent, vars)),
  )

  // Copy shared locales/ directory (i18n translations)
  const localesSrcDir = join(templatesDir, 'shared', 'locales')
  const localesDestDir = join(configDir, 'locales')
  await copyTemplateDir(localesSrcDir, localesDestDir, vars)

  // Copy framework-specific files
  const frameworkDir = join(templatesDir, framework)
  await copyTemplateDir(frameworkDir, join(projectPath, 'src'), vars)
}

/**
 * Recursively copy a template directory, processing `.tpl` files.
 */
export async function copyTemplateDir(
  srcDir: string,
  destDir: string,
  vars: Record<string, string>,
): Promise<void> {
  await mkdir(destDir, { recursive: true })
  const entries = await readdir(srcDir, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name)

    if (entry.isDirectory()) {
      const subDestDir = join(destDir, entry.name)
      await mkdir(subDestDir, { recursive: true })
      await copyTemplateDir(srcPath, subDestDir, vars)
    } else if (entry.name.endsWith('.tpl')) {
      const content = await readFile(srcPath, 'utf-8')
      const outputName = entry.name.replace(/\.tpl$/, '')
      let processed = processTemplate(content, vars)
      if (/\.(ts|tsx|js|mjs)\.tpl$/.test(entry.name)) {
        processed = sortImportStatements(processed)
      }
      await writeFile(join(destDir, outputName), processed)
    }
  }
}

/** Font file that needs to be copied from a package to public/fonts/. */
export interface FontFileToCopy {
  packageName: string
  fontsDir: string
  file: string
}

/**
 * Indent a multi-line CSS block so it nests cleanly inside the `<style>` tag of
 * the generated font HTML (used for icon-font utility classes). Blank lines stay
 * blank.
 */
function indentCssBlock(css: string): string {
  return css
    .split('\n')
    .map((line) => (line.trim() ? `      ${line}` : line))
    .join('\n')
}

/**
 * Generate font HTML from font provider package metadata.
 *
 * For local fonts: returns a `<style>` block with `@font-face` declarations.
 * For CDN fonts (backwards compat): returns `<link>` tags.
 * For system fonts: returns nothing.
 *
 * Also returns a list of font files to copy (for local fonts).
 *
 * @param selectedPackageNames - Names of packages selected for the project
 * @param allPackages - All scanned packages from the registry
 * @returns Object with html string and fontFiles to copy
 */
const ICON_FONT_HEALER_HTML = `    <script>
      // mol:icon-healer — the bundled icon font may be a SUBSET. If a page
      // uses a ligature outside it (user-added icon), the span renders as
      // raw text; load the full font once and it takes over. Pairs with the
      // mol:icon-gate CSS (emitted below): icons are hidden from FIRST PAINT
      // until this script adds .mol-icons-ready to <html> — a blank gap beats
      // raw ligature text in the pre-font flash window, and no JS poll can
      // win that race. Canonical copy:
      // scripts/sweep-flagship-index-fonts.mjs (HEALER const).
      ;(function () {
        var tried = 0
        var fullRequested = false
        function markReady() {
          document.documentElement.classList.add('mol-icons-ready')
        }
        function offending(s) {
          var name = (s.textContent || '').trim()
          if (!name) return false
          var fs = parseFloat(getComputedStyle(s).fontSize) || 24
          return s.offsetWidth > fs * 1.8
        }
        function each(fn) {
          var spans = document.querySelectorAll('.material-symbols-outlined')
          for (var i = 0; i < spans.length; i++) fn(spans[i])
        }
        function needsFull() {
          var found = false
          each(function (s) {
            if (!found && offending(s)) found = true
          })
          return found
        }
        function requestFull() {
          if (fullRequested) return true
          fullRequested = true
          try {
            var f = new FontFace(
              'Material Symbols Outlined',
              "url('/fonts/MaterialSymbolsOutlined.static.woff2') format('woff2')",
              { weight: '100 700', style: 'normal', display: 'block' }
            )
            f.load()
              .then(function (lf) {
                document.fonts.add(lf)
                // two frames: let the new face apply before showing
                requestAnimationFrame(function () {
                  requestAnimationFrame(markReady)
                })
              })
              .catch(markReady)
          } catch (e) {
            markReady()
          }
          return true
        }
        function sweep() {
          var spans = document.querySelectorAll('.material-symbols-outlined')
          if (spans.length > 0) {
            if (!needsFull()) {
              // subset covers every mounted icon — show now, but keep the
              // bounded watch in case a late route mounts an uncovered one
              markReady()
            } else if (requestFull()) {
              return
            }
          }
          if (tried++ < 6) setTimeout(sweep, 1500)
        }
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(sweep)
        else window.addEventListener('load', sweep)
        // Failsafe: even if measurement or the face load never resolves,
        // icons come back (worst case as raw text) instead of staying blank.
        setTimeout(markReady, 3000)
      })()
    </script>`

const ICON_GATE_CSS = `      /* mol:icon-gate — icons stay invisible from FIRST PAINT until the
         icon-healer confirms coverage and adds .mol-icons-ready to <html>
         (3s failsafe reveal baked in): a blank gap beats raw ligature text
         flashing in the pre-font window. */
      html:not(.mol-icons-ready) .material-symbols-outlined {
        visibility: hidden;
        animation: mol-icon-failsafe 0s 3s forwards;
      }
      @keyframes mol-icon-failsafe {
        to {
          visibility: visible;
        }
      }
`

/**
 * Render first-paint font markup and the files the caller must copy.
 *
 * Module mode is for a caller-known Vite index.html pipeline: package font
 * exports are resolved by Vite and shared with runtime font imports, so the
 * returned copy list is empty. Other callers keep the default public paths.
 *
 * @param selectedPackageNames - Selected font providers.
 * @param allPackages - Available package metadata.
 * @param fontAssetMode - Explicit module assets or legacy public copying.
 * @returns Font markup and any required public font copies.
 */
export function generateFontHtml(
  selectedPackageNames: string[],
  allPackages: InferredPackage[],
  fontAssetMode: 'copy' | 'module' = 'copy',
): { html: string; fontFiles: FontFileToCopy[] } {
  if (fontAssetMode !== 'copy' && fontAssetMode !== 'module') {
    throw new Error('Font asset mode must be copy or module')
  }
  // Find font providers with font metadata
  const fontProviders = allPackages.filter(
    (p) => p.molecule?.category === 'fonts' && p.molecule?.type === 'provider' && p.molecule?.font,
  )

  // Check if any font provider is explicitly selected
  let selectedFontProviders = fontProviders.filter((p) => selectedPackageNames.includes(p.name))

  // If none selected, resolve the default provider from the core package
  if (selectedFontProviders.length === 0) {
    const fontCore = allPackages.find(
      (p) => p.molecule?.category === 'fonts' && p.molecule?.type === 'core',
    )
    if (fontCore?.molecule?.defaultProvider) {
      const defaultProv = fontProviders.find((p) => p.name === fontCore.molecule!.defaultProvider)
      if (defaultProv) selectedFontProviders = [defaultProv]
    }
  }

  const lines: string[] = []
  const fontFiles: FontFileToCopy[] = []

  // CDN fonts (backwards compat)
  const preconnectOrigins = new Set<string>()
  const stylesheetUrls: string[] = []

  // Local fonts
  const staticFaces: string[] = []
  const variableFaces: string[] = []
  const utilityCssBlocks: string[] = []
  // Small woff2 text faces worth preloading (never icon fonts — the full
  // Material Symbols file is multi-MB; display:block hides its load window).
  const preloadFaces: string[] = []

  for (const pkg of selectedFontProviders) {
    const font = pkg.molecule!.font!
    // The values below are interpolated into index.html verbatim — the same
    // untrusted metadata the copy paths are containment-checked against (see
    // assertSafeFontMeta). Refused here, the scaffold fails naming the package.
    assertSafeFontMeta(font, pkg.name, fontAssetMode)
    if (font.source === 'system') continue

    if (font.source === 'local' && font.faces) {
      for (const face of font.faces) {
        const fileUrl =
          fontAssetMode === 'module'
            ? `${pkg.name}/${font.fontsDir ?? 'fonts'}/${face.file}`
            : `/fonts/${face.file}`
        // Vite resolves inline CSS asset URLs, but not bare package URLs in
        // preload hrefs. Module mode relies on the first-paint face declaration
        // instead of issuing a broken preload; legacy public preloads stay intact.
        if (fontAssetMode === 'copy' && face.file.endsWith('.woff2') && !font.utilityCss)
          preloadFaces.push(fileUrl)
        if (fontAssetMode === 'copy') {
          fontFiles.push({
            packageName: pkg.name,
            fontsDir: font.fontsDir ?? 'fonts',
            file: face.file,
          })
        }

        const style = face.style ?? 'normal'
        const format = inferFontFormat(face.file)
        const localNames = deriveLocalNames(font.family, face.weight, face.variable)
        const srcParts = [
          ...localNames.map((n) => `local('${n}')`),
          `url('${fileUrl}')${format ? ` format('${format}')` : ''}`,
        ]

        // Variable faces go inside @supports — need deeper indentation (8/10 vs 6/8)
        const indent = face.variable ? '        ' : '      '
        const propIndent = face.variable ? '          ' : '        '

        // Format src on multiple lines when it exceeds printWidth
        const singleLineSrc = `${propIndent}src: ${srcParts.join(', ')};`
        const srcLines =
          singleLineSrc.length <= 100
            ? [singleLineSrc]
            : [
                `${propIndent}src:`,
                ...srcParts.map(
                  (part, i) => `${propIndent}  ${part}${i < srcParts.length - 1 ? ',' : ';'}`,
                ),
              ]

        const declaration = [
          `${indent}@font-face {`,
          `${propIndent}font-family: '${font.family}';`,
          ...srcLines,
          `${propIndent}font-weight: ${face.weight};`,
          face.variable ? null : `${propIndent}font-style: ${style};`,
          `${propIndent}font-display: ${font.utilityCss ? 'block' : 'swap'};`, // icon fonts: block (blank beats raw ligature text)
          `${indent}}`,
        ]
          .filter((l) => l !== null)
          .join('\n')

        if (face.variable) {
          variableFaces.push(declaration)
        } else {
          staticFaces.push(declaration)
        }
      }

      // Icon fonts (Material Symbols) ship a utility class the glyphs need
      // (`.material-symbols-outlined`). Google's CSS used to provide it; now we
      // emit it locally alongside the @font-face so icons work offline.
      if (font.utilityCss) utilityCssBlocks.push(font.utilityCss)
    } else if (font.url) {
      // CDN path
      if (font.preconnect) {
        for (const origin of font.preconnect) {
          preconnectOrigins.add(origin)
        }
      }
      stylesheetUrls.push(font.url)
    }
  }

  // CDN link tags
  for (const origin of preconnectOrigins) {
    if (origin.includes('gstatic')) {
      lines.push(`    <link rel="preconnect" href="${origin}" crossorigin />`)
    } else {
      lines.push(`    <link rel="preconnect" href="${origin}" />`)
    }
  }
  for (const url of stylesheetUrls) {
    lines.push(`    <link href="${url}" rel="stylesheet" />`)
  }

  // Local font style block
  for (const file of preloadFaces) {
    lines.push(`    <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin />`)
  }

  if (staticFaces.length > 0 || variableFaces.length > 0 || utilityCssBlocks.length > 0) {
    lines.push('    <style>')
    lines.push(...staticFaces)
    if (variableFaces.length > 0) {
      lines.push('      @supports (font-variation-settings: normal) {')
      lines.push(...variableFaces)
      lines.push('      }')
    }
    for (const css of utilityCssBlocks) {
      lines.push(indentCssBlock(css))
    }
    // Icon gate: hide icon spans from first paint until the healer confirms
    // coverage (ICON_FONT_HEALER_HTML adds .mol-icons-ready). Blank gap beats
    // a raw ligature name ("360") flashing before the font lands.
    if (utilityCssBlocks.some((css) => css.includes('material-symbols-outlined'))) {
      lines.push(ICON_GATE_CSS)
    }
    lines.push('    </style>')
  }

  // Wrap in marker comments so inject/swap can find and replace later
  if (utilityCssBlocks.length > 0) lines.push(ICON_FONT_HEALER_HTML)

  const inner = lines.join('\n')
  const html = inner ? `    <!-- mol:fonts -->\n${inner}\n    <!-- /mol:fonts -->` : ''

  return { html, fontFiles }
}

/**
 * Infer CSS font format from filename extension.
 */
function inferFontFormat(filename: string): string {
  if (filename.endsWith('.woff2')) return 'woff2'
  if (filename.endsWith('.woff')) return 'woff'
  if (filename.endsWith('.ttf')) return 'truetype'
  if (filename.endsWith('.otf')) return 'opentype'
  return ''
}

/**
 * Derive local() fallback names from family and weight.
 */
function deriveLocalNames(family: string, weight: number | string, variable?: boolean): string[] {
  if (variable) {
    return [family, `${family} VariableFont`, `${family}-VariableFont`]
  }
  const weightNames: Record<string | number, string> = {
    100: 'Thin',
    200: 'ExtraLight',
    300: 'Light',
    400: 'Regular',
    500: 'Medium',
    600: 'SemiBold',
    700: 'Bold',
    800: 'ExtraBold',
    900: 'Black',
    normal: 'Regular',
    bold: 'Bold',
  }
  const suffix = weightNames[weight]
  if (!suffix) return [family]
  return [`${family} ${suffix}`, `${family}-${suffix}`]
}

/**
 * The shapes a font metadata value may take and still sit in the markup it is
 * rendered into.
 *
 * A font package's `molecule.font` (the registry entry, or a non-registry
 * package's own package.json — input the module treats as untrusted for its
 * PATHS, see {@link isInsideDir}) is interpolated verbatim into the app's
 * `index.html`: `family` and `faces[].file` become CSS strings inside the
 * `<!-- mol:fonts -->` block's `<style>`, `faces[].weight` and `faces[].style`
 * become bare declarations, `url`/`preconnect` become `href` attributes, and
 * `utilityCss` is CSS emitted whole. A value carrying the context's own
 * syntax — a `'` that ends a CSS string, a `"` that ends an attribute, a
 * `</style>` that closes the element, a newline that ends a declaration — is
 * markup injection into every page of the scaffolded app, persistent and
 * served, from metadata nothing validated past "is a string".
 *
 * These rules REFUSE rather than escape, on the module's standard for declared
 * metadata (`fc7dbfb89`: refuse a molecule name that is not a package name):
 * the fleet's real values are family names, file names and https URLs, and a
 * declaration that needs escaping is lying about what it declares. Verified
 * against every registry font entry and the flagship templates' fixtures.
 */
const FONT_META_SHAPES = {
  /** CSS family name — also what `stripManagedFontFaces` matches back out of the block. */
  family: /^[A-Za-z0-9][A-Za-z0-9 _-]*$/,
  /** A font file name within `fontsDir` — no separators, no quotes, no markup. */
  faceFile: /^[A-Za-z0-9][A-Za-z0-9._,-]*$/,
  /** An npm package name used as part of a module asset URL. */
  packageName: /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i,
  /** A CSS font-weight: a number, a variable range like `100 1000`, or a keyword `deriveLocalNames` maps. */
  weight: /^(\d{1,4}( \d{1,4})?|normal|bold)$/,
  /** A CSS font-style. */
  style: /^(normal|italic|oblique)$/,
  /** An absolute https stylesheet URL / preconnect origin — the attribute contexts. */
  httpsUrl: /^https:\/\/[^\s"'<>]*$/,
}

/**
 * Refuse a font metadata value that cannot sit in its markup context.
 *
 * Called where the metadata becomes markup — {@link generateFontHtml} at
 * create time and {@link updateHtmlFontBlock} on every later sync — so both
 * sinks render only values this guard admitted, and the failure names the
 * package and the field to fix. At create time the scaffold fails loudly
 * rather than write a poisoned `<head>`; at sync time the caller reports
 * "Asset sync skipped" with this message.
 *
 * @param font - The `molecule.font` metadata being rendered.
 * @param packageName - The package the metadata came from, for the error.
 * @param fontAssetMode - Module mode also validates the package asset path segments.
 * @throws When any value could break out of the markup it renders into.
 */
export function assertSafeFontMeta(
  font: {
    family?: string
    source: string
    fontsDir?: string
    faces?: Array<{ file: string; weight: number | string; style?: string; variable?: boolean }>
    url?: string
    preconnect?: string[]
    utilityCss?: string
  },
  packageName: string,
  fontAssetMode: 'copy' | 'module' = 'copy',
): void {
  const refuse = (field: string, value: unknown): never => {
    throw new Error(
      `Font metadata for ${packageName} is refused: ${field} cannot be rendered safely into ` +
        `index.html (${JSON.stringify(value)}). Declare a plain family name, a file name, a ` +
        'https URL, or CSS without a closing </style> — see the molecule.font registry schema.',
    )
  }
  if (font.source === 'system') return
  if (fontAssetMode === 'module' && font.source === 'local') {
    if (!FONT_META_SHAPES.packageName.test(packageName)) refuse('packageName', packageName)
    if (!FONT_META_SHAPES.faceFile.test(font.fontsDir ?? 'fonts')) refuse('fontsDir', font.fontsDir)
  }
  if (font.family !== undefined && !FONT_META_SHAPES.family.test(font.family))
    refuse('family', font.family)
  for (const face of font.faces ?? []) {
    if (!FONT_META_SHAPES.faceFile.test(face.file)) refuse('faces[].file', face.file)
    if (
      typeof face.weight === 'number' ? face.weight < 0 : !FONT_META_SHAPES.weight.test(face.weight)
    )
      refuse('faces[].weight', face.weight)
    if (face.style !== undefined && !FONT_META_SHAPES.style.test(face.style))
      refuse('faces[].style', face.style)
  }
  if (font.url !== undefined && !FONT_META_SHAPES.httpsUrl.test(font.url)) refuse('url', font.url)
  for (const origin of font.preconnect ?? []) {
    if (!FONT_META_SHAPES.httpsUrl.test(origin)) refuse('preconnect[]', origin)
  }
  if (font.utilityCss !== undefined && /<\/style/i.test(font.utilityCss))
    refuse('utilityCss', '(contains </style>)')
}

/**
 * Copy font files from installed packages to a project's static assets fonts/ directory.
 */
export async function copyFontFiles(
  projectPath: string,
  fontFiles: FontFileToCopy[],
  publicDir = 'public',
): Promise<void> {
  if (fontFiles.length === 0) return

  const fontsDir = join(projectPath, publicDir, 'fonts')
  await mkdir(fontsDir, { recursive: true })

  // npm workspaces hoist packages — walk up from projectPath until we find
  // node_modules containing the font package, or hit the filesystem root.
  // The old 3-level limit missed workspace roots (e.g. when scaffolding
  // into mlcl/.tmp/ which is 4+ levels below molecule-workspace/).
  const nmCandidates: string[] = []
  let dir = projectPath
  for (let i = 0; i < 10; i++) {
    nmCandidates.push(join(dir, 'node_modules'))
    const parent = dirname(dir)
    if (parent === dir) break // filesystem root
    dir = parent
  }

  for (const { packageName, fontsDir: pkgFontsDir, file } of fontFiles) {
    // These segments come from package/registry metadata (`molecule.font`), not
    // from user input — but flatten them the way copySqlSetupScripts does so a
    // crafted `../` in a segment can neither read from nor write outside the
    // intended directories: reject path separators in the metadata-relative
    // parts and basename() the destination file.
    if (/[\\/]/.test(pkgFontsDir) || /[\\/]/.test(file)) {
      console.warn(
        `Skipping font with path separators in metadata: ${packageName}/${pkgFontsDir}/${file}`,
      )
      continue
    }
    const destFile = basename(file)
    let copied = false
    for (const nm of nmCandidates) {
      const source = join(nm, packageName, pkgFontsDir, file)
      // `packageName` is metadata too, and it is the ONE segment the rule above
      // does not cover — a `../…` in it walks out of node_modules and reads any
      // file the process can open (`@molecule/../../..` from
      // `<project>/node_modules` resolves the entry's base to the directory
      // ABOVE the project, which only has to hold a readable
      // `<fontsDir>/<file>`; `fontsDir: '.ssh'` + `file: 'id_rsa'` is that
      // pair). The bytes land in `public/` — a SERVED
      // directory — so this is a read of a file the app must never expose, not
      // a cosmetic path bug. The relative escape is the same for every
      // candidate, so the first failure ends the loop.
      if (!isInsideDir(nm, source)) {
        console.warn(`Skipping font outside node_modules: ${packageName}/${pkgFontsDir}/${file}`)
        break
      }
      try {
        await copyFile(source, join(fontsDir, destFile))
        copied = true
        break
      } catch (_error) {
        // Try next candidate — font file absent from this node_modules location
      }
    }
    if (!copied) {
      console.warn(`Font file not found: ${packageName}/${pkgFontsDir}/${file}`)
    }
  }
}

/**
 * Sync static assets from installed molecule packages to the project.
 *
 * Reads package.json to discover installed `@molecule/*` packages,
 * inspects their `molecule.font` metadata, and:
 * 1. Copies font files to `public/fonts/`
 * 2. Updates the font `<style>` block in index.html (or app.html for Svelte)
 *
 * A project explicitly created with `molecule.fontAssetMode: 'module'` instead
 * retains package asset URLs without copying or removing public files. Missing
 * metadata preserves legacy copying; the framework alone never opts a project in.
 *
 * This is intentionally generic — it reads metadata declared by packages
 * rather than hardcoding knowledge about any specific package. Adding a new
 * font provider to a project requires zero CLI code changes.
 *
 * Called by both `inject` and `swap` commands.
 */
export async function syncProjectAssets(projectPath: string): Promise<void> {
  // Read project's package.json to find @molecule/* deps
  const packageJsonPath = join(projectPath, 'package.json')
  let packageJson: Record<string, unknown>
  try {
    packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
  } catch (_error) {
    // Safe to skip: absent or malformed package.json means this path is not a valid project
    return
  }

  const deps = {
    ...((packageJson.dependencies as Record<string, string>) ?? {}),
    ...((packageJson.devDependencies as Record<string, string>) ?? {}),
  }
  const moleculeDeps = Object.keys(deps).filter((d) => d.startsWith('@molecule/'))
  if (moleculeDeps.length === 0) return

  // Detect framework to determine static assets directory
  const moleculeMeta = packageJson.molecule as
    { framework?: string; fontAssetMode?: 'copy' | 'module' } | undefined
  // Only an explicit creation/caller contract opts into module assets. Older
  // projects and custom/Svelte HTML keep their existing static-copy behavior.
  const fontAssetMode = moleculeMeta?.fontAssetMode === 'module' ? 'module' : 'copy'
  const framework = detectAppFramework(deps, moleculeMeta)
  const appFrameworks = loadAppFrameworks()
  const publicDir = (framework && appFrameworks[framework]?.publicDir) ?? 'public'

  // npm workspaces hoist packages — walk up to find node_modules
  const nmCandidates = [
    join(projectPath, 'node_modules'),
    join(dirname(projectPath), 'node_modules'),
    join(dirname(dirname(projectPath)), 'node_modules'),
  ]

  // Discover font metadata from installed packages
  const fontFiles: FontFileToCopy[] = []
  const fontMetas: Array<{
    /** The package the metadata came from — a refusal names it (see assertSafeFontMeta). */
    packageName: string
    family: string
    source: string
    fontsDir?: string
    faces?: Array<{ file: string; weight: number | string; style?: string; variable?: boolean }>
    url?: string
    preconnect?: string[]
    utilityCss?: string
  }> = []

  // Look up font metadata from centralized registry (preferred) or package.json (fallback)
  const registry = getRawRegistry()

  for (const depName of moleculeDeps) {
    // Try registry first
    const registryEntry = registry.packages[depName]
    const font = registryEntry?.font ?? null

    if (font) {
      fontMetas.push({ ...font, packageName: depName })

      if (font.source === 'local' && font.faces) {
        for (const face of font.faces) {
          fontFiles.push({
            packageName: depName,
            fontsDir: font.fontsDir ?? 'fonts',
            file: face.file,
          })
        }
      }
      continue
    }

    // Fallback: read from package.json in node_modules (for non-registry packages)
    for (const nm of nmCandidates) {
      const depPkgPath = join(nm, depName, 'package.json')
      // `depName` is a manifest KEY, and nothing constrains it past the
      // `@molecule/` prefix this loop filters on — `"@molecule/../../evil"` is a
      // valid key and walks out of node_modules, making mlcl parse a file from
      // anywhere as a package. Checked where the key becomes a path (see
      // isInsideDir); the escape is identical for every candidate.
      if (!isInsideDir(nm, depPkgPath)) {
        console.warn(`Skipping package outside node_modules: ${depName}`)
        break
      }
      try {
        const depPkg = JSON.parse(await readFile(depPkgPath, 'utf-8'))
        const pkgFont = depPkg.molecule?.font
        if (!pkgFont) break // Package found but has no font metadata

        fontMetas.push({ ...pkgFont, packageName: depName })

        if (pkgFont.source === 'local' && pkgFont.faces) {
          for (const face of pkgFont.faces) {
            fontFiles.push({
              packageName: depName,
              fontsDir: pkgFont.fontsDir ?? 'fonts',
              file: face.file,
            })
          }
        }
        break // Found the package, stop checking nm candidates
      } catch (_error) {
        // Try next candidate — package absent from this node_modules location
      }
    }
  }

  // Copy the declared font packages' files FIRST, then merge their declarations
  // into the project's font block, and only then clear what is left over. The
  // copy must come first: deleting before copying meant a copy run that could not
  // produce a file (the font package absent from every node_modules candidate, an
  // unwritable target) left the project with that file GONE — public/fonts
  // emptied, the @font-face block still pointing at files that no longer exist.
  if (fontFiles.length > 0 && fontAssetMode === 'copy') {
    await copyFontFiles(projectPath, fontFiles, publicDir)
  }

  // The sync OWNS only the families its declared font packages provide — never
  // the whole `public/fonts/` directory nor the whole font block. A template's
  // block also carries curated families (a display serif, the icon font) that no
  // declared package backs, so treating "not named by the current package set" as
  // "stale" deleted that family's files AND its @font-face rules from the entry
  // document: an ordinary `mlcl add … --inject` on a scaffolded template left the
  // app without its headline font and its icon font. The block is merged (see
  // {@link updateHtmlFontBlock}) and the merged document decides what is still
  // referenced, so the block write runs BEFORE the cleanup — and a failed block
  // write (a full disk) throws out of here with every file still in place.
  const html =
    fontMetas.length > 0 ? await updateHtmlFontBlock(projectPath, fontMetas, fontAssetMode) : null

  if (fontFiles.length > 0 && fontAssetMode === 'copy') {
    const fontsDir = join(projectPath, publicDir, 'fonts')
    // The basenames of the faces whose metadata segments (`fontsDir`, `file`)
    // carry no path separators — exactly the guard copyFontFiles copies under,
    // so exactly the names it writes. A face whose PACKAGE NAME escapes
    // node_modules is skipped by copyFontFiles too (see isInsideDir), yet still
    // contributes its basename here; sparing a file that was never copied is
    // the safe direction, because this set only ever PREVENTS a removal.
    const written = new Set(
      fontFiles
        .filter(
          ({ fontsDir: pkgFontsDir, file }) => !/[\\/]/.test(pkgFontsDir) && !/[\\/]/.test(file),
        )
        .map(({ file }) => basename(file)),
    )
    // Still pointed at by the document this sync just merged into — or by one
    // of the app's stylesheets — so the file belongs to the app (or to a family
    // no declared package backs), not to a swapped-out provider. Never remove
    // what they still need. (No HTML file at all: only the stylesheets can
    // name a reference, and the written set protects everything else.)
    const referenced = new Set<string>([
      ...(html === null ? [] : referencedFontFiles(html)),
      ...(await referencedFontFilesInStylesheets(projectPath)),
    ])
    try {
      const existing = await readdir(fontsDir)
      for (const file of existing) {
        if (written.has(file)) continue
        if (referenced.has(file)) continue
        try {
          await rm(join(fontsDir, file))
        } catch (_error) {
          /* best-effort: old font file may already be gone or unwritable; skip */
        }
      }
    } catch (_error) {
      // Safe to skip: fonts dir may not exist (nothing copied, nothing stale)
    }
  }
}

/**
 * The font files a document points at (`/fonts/<name>`), as bare basenames.
 *
 * The leftover cleanup asks this of the newly merged document first: a file the
 * document still references belongs to a family the sync does not manage, so it
 * is not a swapped-out provider's stale file and must survive.
 *
 * @param html - The project's entry document.
 * @returns The basenames referenced through a `/fonts/` URL or href.
 */
function referencedFontFiles(html: string): Set<string> {
  const referenced = new Set<string>()
  for (const match of html.matchAll(/\/fonts\/([^'"()\s?]+)/g)) {
    const name = match[1]
    if (name) referenced.add(name)
  }
  return referenced
}

/**
 * The font files the app's STYLESHEETS point at (`/fonts/<name>`), as bare
 * basenames.
 *
 * The cleanup deleted every file in `public/fonts` that neither this run wrote
 * nor the entry document referenced — but an app's own font may be declared in
 * a stylesheet (`@font-face { src: url('/fonts/App-Custom.ttf') }` in
 * `src/index.css`) rather than in `index.html`, and that file is the app's, not
 * a swapped-out provider's leftover. Every `.css` under the app workspace's
 * `src/` and `public/` therefore counts as a reference source.
 *
 * @param projectPath - The app workspace (the directory holding index.html).
 * @returns The basenames referenced by its stylesheets.
 */
async function referencedFontFilesInStylesheets(projectPath: string): Promise<Set<string>> {
  const referenced = new Set<string>()
  for (const root of ['src', 'public']) {
    let entries: Array<{ parentPath: string; name: string; isFile: () => boolean }>
    try {
      entries = (await readdir(join(projectPath, root), {
        recursive: true,
        withFileTypes: true,
      })) as unknown as Array<{ parentPath: string; name: string; isFile: () => boolean }>
    } catch (_error) {
      // The workspace has no such directory — nothing to scan there.
      continue
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.css')) continue
      try {
        const css = await readFile(join(entry.parentPath, entry.name), 'utf-8')
        for (const name of referencedFontFiles(css)) referenced.add(name)
      } catch (_error) {
        // An unreadable stylesheet protects nothing — and must not fail the
        // sync (the file it would have protected is simply re-copied next time).
        continue
      }
    }
  }
  return referenced
}

/** The `<!-- mol:fonts --> … <!-- /mol:fonts -->` block of an entry document. */
const MOL_FONTS_BLOCK = /\s*<!-- mol:fonts -->[\s\S]*?<!-- \/mol:fonts -->/

/**
 * Remove every `@font-face` declaration whose family the sync manages, leaving
 * every other declaration — and the `@supports` wrapper, icon-gate CSS and
 * healer script around them — exactly as it was.
 *
 * Per-family, not whole-block: the sync owns the declarations of the families its
 * declared font packages provide, and nothing else. Markers always stand alone on
 * their own line in the blocks mlcl writes and in the curated template blocks, but
 * a hand-written one-line declaration is handled too.
 *
 * @param inner - The `<!-- mol:fonts -->` block's inner text.
 * @param families - The family names the sync's font packages provide.
 * @returns The block with the managed families' declarations removed, and any
 *   `@supports` wrapper they emptied dropped with them.
 */
function stripManagedFontFaces(inner: string, families: ReadonlySet<string>): string {
  const lines = inner.split('\n')
  const kept: string[] = []
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*@font-face\b/.test(lines[i])) {
      kept.push(lines[i])
      continue
    }
    const declaration: string[] = []
    let depth = 0
    let family: string | null = null
    let j = i
    for (; j < lines.length; j++) {
      const line = lines[j]
      declaration.push(line)
      depth += (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0)
      if (family === null) {
        const match = line.match(/font-family:\s*'([^']+)'/)
        if (match) family = match[1]
      }
      if (depth <= 0) break
    }
    i = j
    if (family !== null && families.has(family)) continue
    kept.push(...declaration)
  }
  // An `@supports` wrapper whose declarations were all managed families is empty
  // now — drop it rather than leave an empty at-rule in the document.
  return kept
    .join('\n')
    .replace(/\n[ \t]*@supports \(font-variation-settings: normal\) \{[ \t]*\n[ \t]*\}/g, '')
}

/**
 * Whether an entry document already carries `css`, comparing
 * whitespace-collapsed — the copy a previous sync wrote is indented, so a
 * byte-for-byte `includes` would miss it and append a duplicate.
 *
 * The icon fonts' utility class (`.material-symbols-outlined`) is the rule this
 * guards: it is not an `@font-face`, so {@link stripManagedFontFaces} never
 * removes it, and without the check every sync appended another copy.
 *
 * @param document - The entry document being merged into.
 * @param css - The utility rule a declared font package provides.
 * @returns True when the rule is already present.
 */
function cssRulePresent(document: string, css: string): boolean {
  const collapse = (value: string): string => value.replace(/\s+/g, ' ').trim()
  return collapse(document).includes(collapse(css))
}

/**
 * Merge the generated font declarations into the project's font block.
 *
 * The block is MERGED, never replaced. The sync owns only the families its
 * declared font packages provide; a curated block (every flagship template's, and
 * any app that added a family by hand) also carries families no declared package
 * backs, plus the icon gate and the icon-healer script. Replacing the block from
 * package metadata alone dropped those families from the entry document and left
 * the cleanup to delete their files. So: the managed families' declarations are
 * removed and re-emitted, and everything else in the block is left standing.
 * Idempotent — a second run strips exactly what the first run added.
 *
 * @param projectPath - The app workspace (the directory holding index.html).
 * @param fontMetas - The font metadata of the project's declared font packages.
 * @param fontAssetMode - The project's explicit asset contract; legacy copy by default.
 * @returns The document's final content, or null when no HTML file was found
 *   (so the caller knows there is nothing whose references could protect a file).
 */
async function updateHtmlFontBlock(
  projectPath: string,
  fontMetas: Array<{
    packageName: string
    family: string
    source: string
    fontsDir?: string
    faces?: Array<{ file: string; weight: number | string; style?: string; variable?: boolean }>
    url?: string
    preconnect?: string[]
    utilityCss?: string
  }>,
  fontAssetMode: 'copy' | 'module' = 'copy',
): Promise<string | null> {
  // Try index.html first, then src/app.html (Svelte)
  const candidates = [join(projectPath, 'index.html'), join(projectPath, 'src', 'app.html')]

  let htmlPath: string | null = null
  let htmlContent: string | null = null
  for (const candidate of candidates) {
    try {
      htmlContent = await readFile(candidate, 'utf-8')
      htmlPath = candidate
      break
    } catch (_error) {
      // Try next — candidate HTML file does not exist at this path
    }
  }

  if (!htmlPath || !htmlContent) return null
  if (fontAssetMode === 'module' && htmlPath !== candidates[0]) {
    throw new Error('Module font assets require Vite index.html; app.html must use copy mode')
  }

  // Build the new font block
  const lines: string[] = []
  const staticFaces: string[] = []
  const variableFaces: string[] = []
  const utilityCssBlocks: string[] = []
  // Small woff2 text faces worth preloading (never icon fonts — the full
  // Material Symbols file is multi-MB; display:block hides its load window).
  const preloadFaces: string[] = []

  for (const font of fontMetas) {
    // The values below are interpolated into the document verbatim — the same
    // untrusted metadata the copy paths are containment-checked against (see
    // assertSafeFontMeta). The throw surfaces as the caller's "Asset sync
    // skipped" warning, naming the package whose declaration cannot render.
    assertSafeFontMeta(font, font.packageName, fontAssetMode)
    if (font.source === 'system') continue

    if (font.source === 'local' && font.faces) {
      for (const face of font.faces) {
        const fileUrl =
          fontAssetMode === 'module'
            ? `${font.packageName}/${font.fontsDir ?? 'fonts'}/${face.file}`
            : `/fonts/${face.file}`
        // Match create-time module handling: Vite does not rewrite a package
        // preload href, so only copy mode emits public preload links.
        if (fontAssetMode === 'copy' && face.file.endsWith('.woff2') && !font.utilityCss)
          preloadFaces.push(fileUrl)
        const style = face.style ?? 'normal'
        const format = inferFontFormat(face.file)
        const localNames = deriveLocalNames(font.family, face.weight, face.variable)
        const srcParts = [
          ...localNames.map((n) => `local('${n}')`),
          `url('${fileUrl}')${format ? ` format('${format}')` : ''}`,
        ]

        // Variable faces go inside @supports — need deeper indentation (8/10 vs 6/8)
        const indent = face.variable ? '        ' : '      '
        const propIndent = face.variable ? '          ' : '        '

        // Format src on multiple lines when it exceeds printWidth
        const singleLineSrc = `${propIndent}src: ${srcParts.join(', ')};`
        const srcLines =
          singleLineSrc.length <= 100
            ? [singleLineSrc]
            : [
                `${propIndent}src:`,
                ...srcParts.map(
                  (part, i) => `${propIndent}  ${part}${i < srcParts.length - 1 ? ',' : ';'}`,
                ),
              ]

        const declaration = [
          `${indent}@font-face {`,
          `${propIndent}font-family: '${font.family}';`,
          ...srcLines,
          `${propIndent}font-weight: ${face.weight};`,
          face.variable ? null : `${propIndent}font-style: ${style};`,
          `${propIndent}font-display: ${font.utilityCss ? 'block' : 'swap'};`, // icon fonts: block (blank beats raw ligature text)
          `${indent}}`,
        ]
          .filter((l) => l !== null)
          .join('\n')

        if (face.variable) {
          variableFaces.push(declaration)
        } else {
          staticFaces.push(declaration)
        }
      }

      // Icon fonts ship a utility class (`.material-symbols-outlined`) — emit it
      // locally alongside the @font-face so icons work without Google's CSS.
      if (font.utilityCss) utilityCssBlocks.push(font.utilityCss)
    } else if (font.url) {
      if (font.preconnect) {
        for (const origin of font.preconnect) {
          if (origin.includes('gstatic')) {
            lines.push(`    <link rel="preconnect" href="${origin}" crossorigin />`)
          } else {
            lines.push(`    <link rel="preconnect" href="${origin}" />`)
          }
        }
      }
      lines.push(`    <link href="${font.url}" rel="stylesheet" />`)
    }
  }

  for (const file of preloadFaces) {
    lines.push(`    <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin />`)
  }

  const iconFaces = utilityCssBlocks.some((css) => css.includes('material-symbols-outlined'))
  // The healer is a script OUTSIDE the <style> element; a curated block already
  // carries one (the sweep's copy differs textually from this constant, so the
  // marker — not the exact bytes — is the idempotency key).
  if (utilityCssBlocks.length > 0 && !htmlContent.includes('mol:icon-healer')) {
    lines.push(ICON_FONT_HEALER_HTML)
  }

  // The declarations the sync manages, kept separate from the `<link>`/`<script>`
  // lines that live outside a `<style>` element.
  const styleBody: string[] = [...staticFaces]
  if (variableFaces.length > 0) {
    styleBody.push('      @supports (font-variation-settings: normal) {')
    styleBody.push(...variableFaces)
    styleBody.push('      }')
  }
  for (const css of utilityCssBlocks) {
    // Idempotency, like the `lines` just below: `generateFontHtml` emits this
    // rule into the document at create time, and every later sync re-emits it —
    // without this check each `mlcl inject` appended ANOTHER copy of the icon
    // font's `.material-symbols-outlined` rule (the gate and healer beside it
    // are already guarded by their markers; a utility class is not an
    // `@font-face`, so stripManagedFontFaces never removes it).
    if (cssRulePresent(htmlContent, css)) continue
    styleBody.push(indentCssBlock(css))
  }
  // Icon gate: hide icon spans from first paint until the healer confirms
  // coverage (ICON_FONT_HEALER_HTML adds .mol-icons-ready). Blank gap beats
  // a raw ligature name ("360") flashing before the font lands.
  if (iconFaces && !htmlContent.includes('mol:icon-gate')) {
    styleBody.push(ICON_GATE_CSS)
  }

  const markerBlock = htmlContent.match(MOL_FONTS_BLOCK)
  const managed = new Set(
    fontMetas.filter((font) => font.source !== 'system').map((font) => font.family),
  )
  // The markers' own surrounding whitespace goes with them; the CONTENT keeps its
  // indentation (a `.trim()` here stripped the first line's indent, so the emitted
  // block no longer looked like the one it replaced).
  let inner = markerBlock
    ? stripManagedFontFaces(
        markerBlock[0]
          .replace(/^\s*<!-- mol:fonts -->/, '')
          .replace(/<!-- \/mol:fonts -->\s*$/, ''),
        managed,
      )
        .replace(/^\n+/, '')
        .replace(/\s+$/, '')
    : ''

  // `lines` live outside the `<style>` element: each is added only when the block
  // does not already carry it, so re-running the sync adds nothing.
  for (const line of lines) {
    if (!inner.includes(line)) inner = inner ? `${inner}\n${line}` : line
  }

  // The declarations go INSIDE the block's own `<style>` when it has one, so a
  // curated block keeps a single style element; otherwise they bring their own.
  const styleInner = styleBody.join('\n')
  if (styleInner) {
    const closeIdx = inner.lastIndexOf('</style>')
    if (closeIdx === -1) {
      inner = inner
        ? `${inner}\n    <style>\n${styleInner}\n    </style>`
        : `    <style>\n${styleInner}\n    </style>`
    } else {
      const head = inner.slice(0, closeIdx)
      const indent = /[ \t]*$/.exec(head)?.[0] ?? ''
      // Drop the closing tag's own indentation and any blank line before it: the
      // insertion point must be byte-stable, or every re-run adds another blank
      // line (a second sync is supposed to be a no-op).
      const before = head.slice(0, head.length - indent.length).replace(/\n+$/, '')
      inner = `${before}\n${styleInner}\n${indent}${inner.slice(closeIdx)}`
    }
  }

  const newBlock = inner ? `    <!-- mol:fonts -->\n${inner}\n    <!-- /mol:fonts -->` : ''

  if (markerBlock) {
    // The replacement goes through a FUNCTION: `inner` is built from font
    // metadata (a `family`, `url`, `faces[].file` or `utilityCss` declared by an
    // installed package), and a `$` sequence in a replacement STRING is special
    // (`$&` splices the whole MATCHED block back in, `$'` everything after it) —
    // a family named `A$&B` put a second copy of the old `<!-- mol:fonts -->`
    // block into the document. Same rule the brand sync applies to its values
    // (see syncIdentityFromBranding).
    htmlContent = htmlContent.replace(MOL_FONTS_BLOCK, () => (newBlock ? '\n' + newBlock : ''))
  } else if (newBlock) {
    // No markers — insert before the first <link> after the meta tags
    const insertPoint = htmlContent.indexOf('    <link rel="apple-touch-icon"')
    if (insertPoint !== -1) {
      htmlContent =
        htmlContent.slice(0, insertPoint) + newBlock + '\n' + htmlContent.slice(insertPoint)
    } else {
      // No marker block AND no anchor to insert one against: the generated block
      // cannot be placed. The document is returned unchanged (the caller reports
      // success either way), so say it out loud — a document with no font wiring
      // is otherwise indistinguishable from one that has it.
      console.warn(
        `[scaffold] ${htmlPath} has neither a <!-- mol:fonts --> block nor a ` +
          `'<link rel="apple-touch-icon">' anchor — the font block was NOT written`,
      )
    }
  }

  await writeGuarded(htmlPath, htmlContent)
  return htmlContent
}

/**
 * Get @molecule packages required by app templates for a given framework.
 * These are imported in the generated boilerplate code and must be installed.
 *
 * Reads `templateRequires` from framework package metadata when available,
 * falling back to the appFramework config (for frameworks without a registry
 * package, e.g. react-native-web).
 */
export function getTemplateRequiredPackages(
  framework: string,
  frameworkPkg?: { molecule?: Record<string, unknown> },
  appFrameworkConfig?: { templateRequires?: string[] },
): string[] {
  // Read templateRequires from framework package metadata in the registry.
  // The shared core packages (app-i18n, app-theme, app-ui, app-styling) are now
  // included in each framework's templateRequires in registry.json, so no hardcoded
  // list is needed here. Specific providers (e.g. app-theme-css-variables) are resolved
  // automatically via `defaultProvider` in the registry + resolveDefaultProviders().
  const metadataRequires = frameworkPkg?.molecule?.templateRequires as string[] | undefined
  return metadataRequires ?? appFrameworkConfig?.templateRequires ?? []
}

/**
 * Add @molecule packages to a project's package.json dependencies.
 *
 * Each package is pinned to the EXACT version from the registry
 * (`moleculeVersions` via {@link getMoleculeVersion}) — never a `^`/`~` range —
 * unless a `versionOverrides` entry is supplied (e.g. a `file:` path when wiring
 * local workspace packages during create).
 */
export async function addPackages(
  projectPath: string,
  packages: string[],
  versionOverrides?: Record<string, string>,
): Promise<void> {
  const packageJsonPath = join(projectPath, 'package.json')
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

  if (!packageJson.dependencies) {
    packageJson.dependencies = {}
  }

  for (const pkg of packages) {
    packageJson.dependencies[pkg] = versionOverrides?.[pkg] ?? getMoleculeVersion(pkg)
  }

  packageJson.dependencies = Object.keys(packageJson.dependencies)
    .sort()
    .reduce((obj: Record<string, string>, key) => {
      obj[key] = packageJson.dependencies[key]
      return obj
    }, {})

  // Guarded like every other in-place rewrite in this module: this manifest
  // already exists (create wrote it moments earlier), and a write that fails
  // mid-flight would leave a truncated package.json — unparseable for
  // `npm install`, the inject steps and every later mlcl command.
  await writeGuarded(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n')
}

/**
 * Check if a directory is a molecule monorepo root.
 */
function isMonorepoRoot(dir: string): boolean {
  try {
    return (
      statSync(join(dir, 'packages', 'api')).isDirectory() &&
      statSync(join(dir, 'packages', 'app')).isDirectory()
    )
  } catch (_error) {
    // Safe to return false: ENOENT or other stat error means this is not a monorepo root
    return false
  }
}

/**
 * Resolve the relative path prefix from a project's `src/` directory to the
 * `node_modules` parent. Walks up from projectPath looking for workspace roots
 * (package.json with `workspaces`), since npm hoists packages to the topmost
 * workspace root.
 */
function resolveNmPrefix(projectPath: string): string {
  let nmDir = projectPath
  let dir = dirname(projectPath)

  while (dir !== dirname(dir)) {
    const pkgPath = join(dir, 'package.json')
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
        if (Array.isArray(pkg.workspaces)) {
          mlclDebug(`[scaffold] resolveNmPrefix: found workspace root at ${dir}`)
          nmDir = dir
        }
      } catch (_error) {
        /* ignore parse errors — malformed package.json is not a workspace root */
      }
    }
    dir = dirname(dir)
  }

  return relative(join(projectPath, 'src'), nmDir)
}

/**
 * Detect the molecule monorepo root.
 * First walks up from startDir, then checks sibling directories.
 */
export function detectMonorepoRoot(startDir?: string): string | null {
  let dir = startDir ?? process.cwd()

  // Walk up to check if we're inside the monorepo
  for (let i = 0; i < 5; i++) {
    if (isMonorepoRoot(dir)) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  // Check sibling directories (e.g., ../molecule next to ../molecule-dev)
  const parent = dirname(startDir ?? process.cwd())
  try {
    const siblings = readdirSync(parent, { withFileTypes: true })
    for (const sibling of siblings) {
      if (sibling.isDirectory()) {
        const candidate = join(parent, sibling.name)
        if (isMonorepoRoot(candidate)) return candidate
      }
    }
  } catch (_error) {
    // Safe to skip: parent directory not accessible — returns null below
  }

  return null
}

/**
 * Generate a .env file from package-declared secrets.
 *
 * @param projectPath - Directory the .env file is written into.
 * @param secrets - Secrets aggregated from package metadata (registry).
 * @param projectType - 'api' or 'app' — drives baseline non-secret config.
 * @param projectName - Optional. When supplied, binds the DATABASE_URL db-name
 *   slot to the user's project rather than the generic 'my-app' placeholder.
 */
export async function generateEnvFile(
  projectPath: string,
  secrets: MoleculeSecret[],
  projectType: 'api' | 'app' = 'api',
  projectName = 'my-app',
): Promise<void> {
  const lines = ['# Environment variables', '# Generated by mlcl create', '']

  // Write .env.example alongside .env — key names only, values redacted.
  // This is what a bot sees when it clones the repo (the real .env is gitignored).
  // projectPath is the workspace DIRECTORY (the .env goes to <dir>/.env below).
  // Treating it as the .env path wrote the example over the directory path itself,
  // which made a FILE named `api` for a template with no api/ workspace and then
  // failed the scaffold with ENOTDIR (static-site-thin, 2026-09-26).
  const examplePath = join(projectPath, '.env.example')
  // An example that ALREADY exists is kept: the copy step above deliberately
  // preserves a template's curated `.env.example` (shouldSkipDuringCopy), and an
  // unconditional write clobbered it — every scaffolded static-site /
  // static-site-thin lost its VITE_SITE_URL / BASE_PATH schema doc here. Same
  // never-clobber policy as ensureRootNpmrc / ensureAgentsMd: the generated
  // key-name example only fills an absence.
  if (!existsSync(examplePath)) {
    const exampleContent = lines.concat(secrets.map((s) => `${s.name}=`)).join('\n')
    try {
      await writeFile(examplePath, exampleContent)
    } catch (_error) {
      // .env.example is best-effort — a failure to write it should never block the scaffold.
    }
  }

  if (projectType === 'app') {
    // VITE_API_URL is intentionally left empty so the frontend uses
    // same-origin requests to /api/* and Vite's dev proxy forwards them
    // to localhost:<api-port>. Hardcoding an absolute localhost URL
    // here breaks every non-localhost client (LAN / Tailscale / phone)
    // because the browser resolves "localhost" to the client device,
    // not the dev-server box. Set VITE_API_URL only if the frontend
    // genuinely needs to point at a different origin (e.g. production
    // builds with a separate API host).
    lines.push('VITE_API_URL=')
    lines.push('')
  } else {
    lines.push('PORT=4000')
    lines.push('NODE_ENV=development')
    lines.push('')
  }

  // Add secrets from packages (deduplicated). Defaults from registry are
  // used as-is, except DATABASE_URL gets the user's project name for the
  // db slot when a generic placeholder is the registry default. The
  // VITE_-prefix project-type filter + per-secret comment format live in
  // env-file.ts, shared with `mlcl inject`'s .env append path.
  const applicable = filterEnvSecrets(
    secrets,
    projectType,
    projectType === 'app' ? ['VITE_API_URL'] : ['PORT', 'NODE_ENV'],
  )

  // Secrets marked `generate` in the registry (JWT keypair, VAPID keypair,
  // random keys) never require user setup — generate real values now so the
  // scaffolded app works out of the box.
  const generated = generateSecretValues(applicable)

  for (const secret of applicable) {
    let value = generated.get(secret.name) ?? secret.default ?? ''
    if (secret.name === 'DATABASE_URL') {
      value = resolveDatabaseUrlValue(value, projectName)
    }
    lines.push(
      ...renderEnvSecretLines(secret, value, {
        generated: generated.has(secret.name),
        generatedBy: 'mlcl create',
      }),
    )
    lines.push('')
  }

  // Drop a trailing blank so the file ends with exactly one newline.
  while (lines[lines.length - 1] === '') lines.pop()
  lines.push('')
  // The .env can carry generated secrets (JWT private key PEM, VAPID keypair,
  // hex API keys) — create it owner-only so a fresh scaffold never leaves
  // credentials world-readable under a default umask.
  //
  // `mode` only applies when the file is CREATED; an `.env` that already exists
  // keeps whatever permissions it had. That is reachable on a re-scaffold
  // (`mlcl create --force` over a directory that already holds a project, whose
  // `.env` an earlier checkout or a manual edit left group/other-readable), and
  // the write then puts FRESH generated credentials — the JWT private key, the
  // VAPID keypair — into a readable file. `chmod` covers the existing-file case;
  // the same pair the `.env` APPEND path applies (env-file.ts writes with mode
  // 0o600 AND chmods) so every path that can add a secret to an .env ends with
  // the same owner-only guarantee.
  const envPath = join(projectPath, '.env')
  await writeFile(envPath, lines.join('\n'), { mode: 0o600 })
  await chmod(envPath, 0o600)
}

// ============================================================================
// Package scaffolding (used by `mlcl init`)
// ============================================================================

/**
 * Resolve the correct directory for a package based on its type, stack, and category.
 *
 * Given a monorepo root (e.g., `/path/to/molecule`), returns the full path where
 * the package should live. This is the SINGLE SOURCE OF TRUTH for the
 * type → directory mapping. Never place packages manually.
 *
 * @param monorepoRoot - Absolute path to the molecule monorepo root (containing `packages/`)
 * @param meta - Package metadata (must include name, type, stack, category)
 * @returns Absolute path to the package directory
 */
export function resolvePackageDirectory(
  monorepoRoot: string,
  meta: Pick<InferredMetadata, 'name' | 'type' | 'stack' | 'category'> & { providerName?: string },
): string {
  const base = join(monorepoRoot, 'packages')

  // Extract provider name from package name for bond packages
  const providerName = meta.providerName ?? extractProviderName(meta.name, meta.category)

  // Extract the short name after stack and structural prefixes
  const shortName = meta.name
    .replace(/^(api|app)-/, '')
    .replace(/^resource-/, '')
    .replace(/^middleware-/, '')
    .replace(/^utilities-/, '')

  switch (meta.type) {
    case 'core':
      return containedPackageDir(base, join(base, meta.stack, 'core', meta.category))
    case 'provider':
      return containedPackageDir(base, join(base, meta.stack, 'bonds', meta.category, providerName))
    case 'resource':
      return containedPackageDir(base, join(base, 'api', 'resources', shortName))
    case 'middleware':
      return containedPackageDir(base, join(base, 'api', 'middleware', shortName))
    case 'utility':
      return containedPackageDir(base, join(base, 'api', 'utilities', shortName))
    case 'infrastructure':
      return containedPackageDir(base, join(base, 'api', 'infrastructure', shortName))
    case 'framework':
      return containedPackageDir(base, join(base, 'app', 'frameworks', shortName))
    case 'feature':
      return containedPackageDir(base, join(base, 'app', 'features', shortName))
    case 'native':
      return containedPackageDir(base, join(base, 'app', 'native', shortName))
    default:
      throw new Error(`Unknown package type: ${String(meta.type)}`)
  }
}

/**
 * A resolved package directory must stay INSIDE the monorepo's `packages/` —
 * refuse, never return, one that does not.
 *
 * The path is assembled from `mlcl init` metadata (`--category`, `--name`), and
 * `join()` resolves a `../` happily: `--category '../../somewhere'` on a
 * provider made this return `packages/api/bonds/../../somewhere/<provider>`,
 * and `mlcl init` then creates a package — and scaffolds into it — OUTSIDE the
 * monorepo, the same traversal `mlcl create` refuses at its own boundary (see
 * the slug rule in `src/commands/create.ts`). Every legitimate category and
 * name is a plain name, so the containment refuses nothing real.
 *
 * @param baseDir - The monorepo's `packages/` directory.
 * @param resolved - The directory the type switch assembled.
 * @returns The resolved directory, when it is inside `baseDir`.
 * @throws When the resolved directory escapes `baseDir`.
 */
function containedPackageDir(baseDir: string, resolved: string): string {
  if (!isInsideDir(baseDir, resolved)) {
    throw new Error(
      `Package directory ${resolved} is outside ${baseDir} — refuse to scaffold outside the ` +
        'monorepo. Check the package name and category metadata.',
    )
  }
  return resolved
}

/**
 * Refuse an `implements` value that is not an npm package name.
 *
 * The value is emitted inside a generated `provider.ts` import —
 * `import type { XProvider } from '${meta.implements}'` — so a `'` in it ends
 * the module specifier and everything after it is generated TypeScript, code
 * in the scaffolded package from `mlcl init --implements` metadata nothing
 * validated past "is a string". Real values are package names
 * (`@molecule/api-cache`); the npm name shape is what the field declares.
 *
 * @param name - The `implements` metadata value.
 * @returns The value, once it is a package name.
 * @throws When the value is not an npm package name.
 */
export function assertNpmPackageName(name: string): string {
  if (!/^(@[A-Za-z0-9][A-Za-z0-9._-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) {
    throw new Error(
      `Refusing implements value ${JSON.stringify(name)} — it is not an npm package name ` +
        '(scope optional, then a name of letters, digits, dots, underscores and dashes), ' +
        'and it is written into generated source as a module specifier.',
    )
  }
  return name
}

/**
 * Refuse a table name that cannot sit in the places it is written.
 *
 * The name becomes BOTH a file (`src/__setup__/<table>.sql`, so a `/`, `\` or
 * `..` writes outside the package) and a quoted SQL identifier in the
 * migration the project's runner replays (`CREATE TABLE IF NOT EXISTS
 * "<table>"`, so a `"` ends the identifier and everything after it is SQL).
 * It also rides the generated handlers' templates as data. `mlcl init`
 * derives it from `--category` unvalidated, and categories legitimately carry
 * hyphens (`code-editor` → `code-editors`), so the rule is the sinks' own:
 * no path syntax, no quote, no control character. Every real name in the
 * registry is a plain identifier and passes.
 *
 * @param tableName - The table name from package metadata.
 * @returns The name, once it is safe for the file and the identifier.
 * @throws When the name carries path, quote or control syntax.
 */
export function assertSafeTableName(tableName: string): string {
  // Character-code walk rather than a control-range regex: the gate IS "no
  // control characters here", and `no-control-regex` exists because matching
  // them in a regex literal is usually a mistake — here the check is the point.
  const hasControlChar = [...tableName].some((ch) => {
    const code = ch.charCodeAt(0)
    return code < 0x20 || code === 0x7f
  })
  const bad =
    tableName.length === 0 ||
    /[/\\"]/.test(tableName) ||
    tableName.split(/[\\/]/).some((segment) => segment === '..') ||
    hasControlChar
  if (bad) {
    throw new Error(
      `Refusing table name ${JSON.stringify(tableName)} — a table name may not carry path ` +
        'separators, "..", quotes or control characters, because it becomes ' +
        'src/__setup__/<table>.sql and the quoted identifier in the generated DDL.',
    )
  }
  return tableName
}

/**
 * Extract provider name from a package name.
 * e.g., "api-cache-redis" with category "cache" → "redis"
 * e.g., "app-code-editor-monaco" with category "code-editor" → "monaco"
 */
function extractProviderName(name: string, category: string): string {
  const withoutStack = name.replace(/^(api|app)-/, '')
  if (withoutStack.startsWith(category + '-')) {
    return withoutStack.slice(category.length + 1)
  }
  const parts = withoutStack.split('-')
  return parts[parts.length - 1]
}

interface ScaffoldResult {
  /** Absolute path to the created package directory. */
  path: string
  /** Files created (relative to package dir). */
  files: string[]
}

/**
 * The `repository` field for a package inside the molecule monorepo.
 *
 * `directory` is derived from the real path rather than passed in, so it cannot
 * drift the way four hand-written ones did after a directory move. Returns an
 * empty object outside the monorepo, where claiming molecule's repository URL
 * would be false — and a false provenance claim is worse than an absent one.
 *
 * @param targetDir - Absolute path of the package directory.
 * @returns `{ repository }`, or `{}` when the path is not under `packages/`.
 */
function moleculeRepository(targetDir: string): {
  repository?: { type: string; url: string; directory: string }
} {
  const parts = targetDir.split(sep)
  const index = parts.lastIndexOf('packages')
  if (index === -1) return {}
  return {
    repository: {
      type: 'git',
      url: 'https://github.com/molecule-dev/molecule.git',
      directory: parts.slice(index).join('/'),
    },
  }
}

/**
 * Scaffold a new molecule package from inferred metadata.
 *
 * Generates the full package structure appropriate for the type:
 * - Core: types.ts, provider.ts, index.ts
 * - Provider/Bond: types.ts, provider.ts, index.ts (with implements)
 * - Resource: types.ts, routes.ts, requestHandlerMap.ts, handlers/, authorizers/index.ts,
 *   __setup__/<table>.sql, index.ts
 * - Middleware/Utility: index.ts
 *
 * @param targetDir - Directory to create the package in (created if missing)
 * @param meta - Inferred package metadata
 */
export async function scaffoldPackage(
  targetDir: string,
  meta: InferredMetadata,
  options?: { skipExisting?: boolean },
): Promise<ScaffoldResult> {
  const fullName = `@molecule/${meta.name}`
  const cleanName = meta.name
    .replace(/^(api|app)-/, '')
    .replace(/^resource-/, '')
    .replace(/^middleware-/, '')
    .replace(/^utilities-/, '')
  const pascalName = toPascalCase(cleanName)
  const files: string[] = []
  const skip = options?.skipExisting ?? false

  /** Write file, skipping if it already exists when skipExisting is set. */
  const safeWrite = async (path: string, content: string): Promise<boolean> => {
    if (skip && existsSync(path)) return false
    await writeFile(path, content)
    return true
  }

  await mkdir(join(targetDir, 'src'), { recursive: true })

  // ---- package.json ----
  const toolchain = loadToolchain()
  const peerDeps: Record<string, string> = {}
  const devDeps: Record<string, string> = {
    ...toolchain.moleculePackage,
  }

  if (meta.implements) {
    // peerDependencies may use a range (the one pinning exception); the exact
    // version is the registry-tracked @molecule version, the devDep pins exact.
    peerDeps[meta.implements] = `^${getMoleculeVersion(meta.implements)}`
    devDeps[meta.implements] = getMoleculeVersion(meta.implements)
  }
  const registry = getRawRegistry()
  const implicitPeers = registry.typeDefaults?.[meta.type]?.implicitPeers ?? []
  for (const peer of implicitPeers) {
    peerDeps[peer] = `^${getMoleculeVersion(peer)}`
  }

  // Metadata is stored in the centralized registry (mlcl/registry.json),
  // not in individual package.json files.

  const packageJson = {
    name: fullName,
    version: '1.0.0',
    description: meta.description,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    scripts: {
      build: 'tsc',
      test: 'vitest run',
      'test:watch': 'vitest',
    },
    exports: {
      '.': {
        types: './dist/index.d.ts',
        import: './dist/index.js',
      },
    },
    // README.md is the AI-first package doc that Synthase reads via
    // read_molecule_doc, so it MUST ship in the tarball — a package whose
    // `files` omits it publishes undocumented.
    files: ['dist', 'README.md'],
    keywords: ['molecule', ...cleanName.split('-')],
    // Apache-2.0, matching the root LICENSE and the rest of the fleet — every
    // published molecule package is Apache-2.0. This template said MIT, so
    // every package scaffolded from it contradicted the repo's own licence —
    // see the workspace AGENTS.md "Legal entity vs. brand".
    license: 'Apache-2.0',
    // Required for publishing. With NPM_CONFIG_PROVENANCE on, npm signs a
    // Sigstore bundle naming the source repo and the registry rejects the
    // publish with E422 unless package.json agrees — which failed 548 packages
    // on 2026-08-05. Derived from the path so `directory` is always truthful;
    // omitted entirely outside the monorepo, where this URL would be a lie.
    ...moleculeRepository(targetDir),
    devDependencies: sortKeys(devDeps),
    ...(Object.keys(peerDeps).length > 0 ? { peerDependencies: sortKeys(peerDeps) } : {}),
    ...(Object.keys(peerDeps).length > 0
      ? {
          peerDependenciesMeta: Object.fromEntries(
            Object.keys(peerDeps).map((k) => [k, { optional: true }]),
          ),
        }
      : {}),
  }

  if (
    await safeWrite(join(targetDir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n')
  ) {
    files.push('package.json')
  }

  // ---- tsconfig.json ----
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      declaration: true,
      declarationMap: true,
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'src/**/__tests__/**'],
  }

  if (await safeWrite(join(targetDir, 'tsconfig.json'), formatJson(tsconfig))) {
    files.push('tsconfig.json')
  }

  // ---- Source files (type-specific) ----
  // Skip source scaffolding if the package already has source files
  const hasSources = skip && existsSync(join(targetDir, 'src', 'index.ts'))
  if (!hasSources) {
    switch (meta.type) {
      case 'core':
        files.push(...(await scaffoldCore(targetDir, pascalName, cleanName)))
        break
      case 'provider':
        files.push(...(await scaffoldProvider(targetDir, cleanName, meta)))
        break
      case 'resource':
        files.push(...(await scaffoldResource(targetDir, pascalName, cleanName, meta)))
        break
      case 'middleware':
        files.push(...(await scaffoldMiddleware(targetDir, pascalName, cleanName)))
        break
      case 'utility':
        files.push(...(await scaffoldUtility(targetDir, pascalName, cleanName)))
        break
      case 'infrastructure':
        files.push(...(await scaffoldCore(targetDir, pascalName, cleanName)))
        break
      case 'framework':
        files.push(...(await scaffoldFramework(targetDir, pascalName, cleanName, meta)))
        break
      case 'feature':
        files.push(...(await scaffoldFeature(targetDir, pascalName, cleanName)))
        break
      case 'native':
        files.push(...(await scaffoldNative(targetDir, pascalName, cleanName)))
        break
      default:
        files.push(...(await scaffoldCore(targetDir, pascalName, cleanName)))
    }
  }

  // ---- README.md ----
  const implementsSection = meta.implements ? `\n\n## Implements\n\`${meta.implements}\`` : ''
  const secretsList =
    meta.secrets.length > 0
      ? meta.secrets
          .map((s) => `- \`${s.name}\`${s.required ? ' (required)' : ' (optional)'}`)
          .join('\n')
      : '- None'

  if (
    await safeWrite(
      join(targetDir, 'README.md'),
      await loadTemplate('package/README.md.tpl', {
        FULL_NAME: fullName,
        DESCRIPTION: meta.description,
        TYPE: meta.type,
        IMPLEMENTS_SECTION: implementsSection,
        SECRETS_LIST: secretsList,
      }),
    )
  ) {
    files.push('README.md')
  }

  return { path: targetDir, files }
}

async function scaffoldCore(dir: string, pascalName: string, cleanName: string): Promise<string[]> {
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName }
  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/core/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'provider.ts'),
    await loadTemplate('package/core/provider.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/core/index.ts.tpl', vars),
  )
  return ['src/types.ts', 'src/provider.ts', 'src/index.ts']
}

/**
 * Write a provider/bond package's three source files.
 *
 * The provider's own Pascal names are DERIVED here from `cleanName` (the label
 * segment and the category segment), never taken from the caller's package-wide
 * `pascalName`: a provider is `<category>-<provider>`, so `PASCAL_NAME` of the
 * whole package is neither of the two identifiers its templates need. The
 * parameter used to be threaded in and left unread.
 *
 * @param dir - The package directory to write into.
 * @param cleanName - The package name without its `@molecule/`/stack prefix.
 * @param meta - Inferred package metadata (implements, secrets).
 * @returns The files written, relative to `dir`.
 */
async function scaffoldProvider(
  dir: string,
  cleanName: string,
  meta: InferredMetadata,
): Promise<string[]> {
  const parts = cleanName.split('-')
  const providerLabel = parts.length > 1 ? parts[parts.length - 1] : cleanName
  const providerPascal = toPascalCase(providerLabel)
  const categoryPascal = toPascalCase(parts[0])

  const vars = {
    PROVIDER_PASCAL: providerPascal,
    CATEGORY_PASCAL: categoryPascal,
    PROVIDER_LABEL: providerLabel,
    CLEAN_NAME: cleanName,
    IMPLEMENTS_IMPORT: meta.implements
      ? `import type { ${categoryPascal}Provider } from '${assertNpmPackageName(meta.implements)}'\n\n`
      : '',
    IMPLEMENTS_CLAUSE: meta.implements ? ` implements ${categoryPascal}Provider` : '',
    PROCESS_ENV_INTERFACE:
      meta.secrets.length > 0
        ? `\nexport interface ProcessEnv {\n${meta.secrets.map((s) => `  ${s.name}: string`).join('\n')}\n}\n`
        : '',
  }

  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/provider/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'provider.ts'),
    await loadTemplate('package/provider/provider.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/provider/index.ts.tpl', vars),
  )
  return ['src/types.ts', 'src/provider.ts', 'src/index.ts']
}

async function scaffoldResource(
  dir: string,
  pascalName: string,
  cleanName: string,
  meta: InferredMetadata,
): Promise<string[]> {
  const tableName = assertSafeTableName(meta.tables[0] ?? cleanName + 's')
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName, TABLE_NAME: tableName }

  await mkdir(join(dir, 'src', 'handlers'), { recursive: true })
  await mkdir(join(dir, 'src', 'authorizers'), { recursive: true })
  await mkdir(join(dir, 'src', '__setup__'), { recursive: true })

  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/resource/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'routes.ts'),
    await loadTemplate('package/resource/routes.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'requestHandlerMap.ts'),
    await loadTemplate('package/resource/requestHandlerMap.ts.tpl'),
  )

  // Handler stubs
  const handlers = ['create', 'list', 'read', 'update', 'del']
  for (const name of handlers) {
    await writeFile(
      join(dir, 'src', 'handlers', `${name}.ts`),
      await loadTemplate(`package/resource/handlers/${name}.ts.tpl`, vars),
    )
  }

  await writeFile(
    join(dir, 'src', 'handlers', 'index.ts'),
    await loadTemplate('package/resource/handlers/index.ts.tpl'),
  )
  await writeFile(
    join(dir, 'src', 'authorizers', 'index.ts'),
    await loadTemplate('package/resource/authorizers/index.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', '__setup__', `${tableName}.sql`),
    await loadTemplate('package/resource/__setup__/table.sql.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/resource/index.ts.tpl', vars),
  )

  return [
    'src/types.ts',
    'src/routes.ts',
    'src/requestHandlerMap.ts',
    ...handlers.map((h) => `src/handlers/${h}.ts`),
    'src/handlers/index.ts',
    'src/authorizers/index.ts',
    `src/__setup__/${tableName}.sql`,
    'src/index.ts',
  ]
}

async function scaffoldMiddleware(
  dir: string,
  pascalName: string,
  cleanName: string,
): Promise<string[]> {
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName, CAMEL_NAME: camelCase(cleanName) }
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/middleware/index.ts.tpl', vars),
  )
  return ['src/index.ts']
}

async function scaffoldUtility(
  dir: string,
  _pascalName: string,
  cleanName: string,
): Promise<string[]> {
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/utility/index.ts.tpl', { CLEAN_NAME: cleanName }),
  )
  return ['src/index.ts']
}

async function scaffoldFramework(
  dir: string,
  pascalName: string,
  cleanName: string,
  _meta: InferredMetadata,
): Promise<string[]> {
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName }
  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/framework/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/framework/index.ts.tpl', vars),
  )
  return ['src/types.ts', 'src/index.ts']
}

async function scaffoldFeature(
  dir: string,
  pascalName: string,
  cleanName: string,
): Promise<string[]> {
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName }
  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/feature/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'provider.ts'),
    await loadTemplate('package/feature/provider.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/feature/index.ts.tpl', vars),
  )
  return ['src/types.ts', 'src/provider.ts', 'src/index.ts']
}

async function scaffoldNative(
  dir: string,
  pascalName: string,
  cleanName: string,
): Promise<string[]> {
  const vars = { PASCAL_NAME: pascalName, CLEAN_NAME: cleanName }
  await writeFile(
    join(dir, 'src', 'types.ts'),
    await loadTemplate('package/native/types.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'provider.ts'),
    await loadTemplate('package/native/provider.ts.tpl', vars),
  )
  await writeFile(
    join(dir, 'src', 'index.ts'),
    await loadTemplate('package/native/index.ts.tpl', vars),
  )
  return ['src/types.ts', 'src/provider.ts', 'src/index.ts']
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((word) => {
      const upper = word.toUpperCase()
      if (['AI', 'HTTP', 'UI', 'JWT', 'SSO', 'API', 'DB', 'SQL', 'IO'].includes(upper)) {
        return upper
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join('')
}

function camelCase(str: string): string {
  const pascal = toPascalCase(str)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.keys(obj)
    .sort()
    .reduce((acc: Record<string, string>, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
}

/**
 * Copy SQL setup scripts from registry table metadata.
 * Tries node_modules first (when packages are installed via npm) and falls
 * back to the package's source path on disk so `mlcl create --skip-install`
 * still ships the table SQL — without it, every flagship missing SQL files
 * boots with empty schemas for resource packages it depends on.
 *
 * Each copy is preceded by {@link migrationDialectHeader} for the bond the
 * selection names, so the file an agent opens in a SQLite/MySQL app says which
 * database it runs on and that this published Postgres-dialect SQL applies as
 * it is (X1 flash-m69 re-transcribed four packages' schemas after reading one of
 * these files as broken).
 */
export async function copySqlSetupScripts(
  projectPath: string,
  selectedPackageNames: string[],
  allPackages: InferredPackage[],
): Promise<void> {
  const copiedFiles = new Set<string>()
  const dialectHeader = migrationDialectHeader(databasePackageOf(selectedPackageNames))

  for (const pkgName of selectedPackageNames) {
    const pkg = allPackages.find((p) => p.name === pkgName)
    if (!pkg || pkg.tables.length === 0) continue

    for (const table of pkg.tables) {
      if (copiedFiles.has(table.sqlFile)) continue

      const fileName = basename(table.sqlFile)
      // Each candidate source must stay INSIDE the package it is declared for.
      // `table.sqlFile` and `pkgName` are metadata (`join()` resolves `../`
      // happily), and whatever lands here is replayed as SQL by the generated
      // migration runner's `__setup__/` step — the same untrusted-metadata rule
      // the font copies apply through isInsideDir. A refusing path is skipped
      // with a warning, the same non-fatal treatment a merely-absent file gets.
      const packageRoots = [
        join(projectPath, 'node_modules', pkgName),
        // Source-tree fallback for --skip-install / monorepo layouts
        // where node_modules isn't populated when scaffolding runs.
        pkg.path,
      ]
      const candidates = packageRoots.flatMap((root) => {
        const source = join(root, table.sqlFile)
        if (!isInsideDir(root, source)) {
          console.warn(
            `[scaffold] skipping sqlFile outside its package: ${pkgName} declares ${JSON.stringify(table.sqlFile)}`,
          )
          return []
        }
        return [source]
      })
      for (const source of candidates) {
        try {
          const sql = await readFile(source, 'utf-8')
          await writeFile(join(projectPath, '__setup__', fileName), `${dialectHeader}${sql}`)
          copiedFiles.add(table.sqlFile)
          break
        } catch (_error) {
          // Safe to try next: SQL file absent from this candidate path (node_modules or source tree)
        }
      }
    }
  }

  // The migration runner statically imports its PGlite migrator from
  // @molecule/api-bonds-default-express; declare that package so a real
  // install resolves it and `tsc`/`db:setup` work outside this hoisted
  // workspace — and when the runner's browser branch is emitted reachable,
  // promote the PGlite bond's pin into `dependencies` (a devDependencies pin
  // is pruned from production deploy trees, crashing boot-time migrations
  // where the branch fires). Both paths here carry such a runner: the custom
  // create flow runs this AFTER `mlcl inject` wrote the runner (so the runner
  // on disk is the final one), and the --template fast path
  // (copyTemplateInstance) calls this BEFORE re-rendering the runner from
  // migrate.ts.tpl — which declares the import again itself, so the order
  // there is not load-bearing. No-op for database-less builds (no runner) and
  // idempotent for manifests that already back the runner.
  await ensureMigrateRunnerImports(projectPath)
}

/**
 * Create a Cloudflare Workers status page project from the edge template.
 */
export async function createStatusPageEdgeProject(
  projectPath: string,
  projectName: string,
): Promise<void> {
  const templatesDir = getTemplatesDir()
  const edgeTemplateDir = join(templatesDir, 'status-page-edge')

  await mkdir(projectPath, { recursive: true })

  // Copy all template files from status-page-edge/ template directory
  if (existsSync(edgeTemplateDir)) {
    await copyTemplateDir(edgeTemplateDir, projectPath, {
      PROJECT_NAME: projectName,
    })
  } else {
    // Generate inline if template directory doesn't exist yet
    await mkdir(join(projectPath, 'src'), { recursive: true })

    // `typescript` and `vitest` come from the registry toolchain — the single
    // source of truth every other create path spreads (`...toolchain.shared`,
    // `...toolchain.api`). The literals that used to sit here drifted from the
    // fleet on the first bump: this manifest pinned vitest 4.1.10 while the
    // registry, mlcl's own package.json and every flagship template moved to
    // 4.1.11, so an edge status page installed a toolchain no other generated
    // project shares — and every later bump would skip this path the same way.
    // The `||` fallbacks cover a checkout whose registry carries no toolchain
    // section, the same policy createReactNativeAppProject follows. The
    // wrangler / workers-types pins have no registry entry to read.
    const toolchain = loadToolchain()
    const packageJson = {
      name: projectName,
      version: '0.0.1',
      private: true,
      type: 'module',
      scripts: {
        dev: 'wrangler dev',
        deploy: 'wrangler deploy',
        build: 'tsc',
        test: 'vitest run',
      },
      devDependencies: {
        '@cloudflare/workers-types': '5.20260730.1',
        '@molecule/api-monitoring': getMoleculeVersion('@molecule/api-monitoring'),
        typescript: toolchain.shared.typescript || '6.0.3',
        vitest: toolchain.api.vitest || '4.1.12',
        wrangler: '4.115.0',
      },
    }

    await writeFile(join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n')
    await writeFile(join(projectPath, '.npmrc'), await loadTemplate('shared/npmrc.tpl'))

    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        lib: ['ES2022'],
        types: ['@cloudflare/workers-types'],
        strict: true,
        skipLibCheck: true,
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }

    await writeFile(join(projectPath, 'tsconfig.json'), formatJson(tsconfig))

    await writeFile(
      join(projectPath, 'wrangler.toml'),
      `name = "${projectName}"
main = "src/index.ts"
compatibility_date = "2025-02-14"

[triggers]
crons = ["*/5 * * * *"]

[[kv_namespaces]]
binding = "STATUS_KV"
id = ""
preview_id = ""
`,
    )

    await writeFile(
      join(projectPath, 'src', 'index.ts'),
      `/**
 * ${projectName} — Cloudflare Workers status page
 *
 * Uses @molecule/api-monitoring types for health check definitions.
 */

import type { CheckStatus, SystemHealth } from '@molecule/api-monitoring'

export interface Env {
  STATUS_KV: KVNamespace
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/status') {
      const raw = await env.STATUS_KV.get('system-health')
      if (!raw) {
        const empty: SystemHealth = {
          status: 'operational' as CheckStatus,
          checks: {},
          timestamp: new Date().toISOString(),
        }
        return Response.json(empty)
      }
      const health: SystemHealth = JSON.parse(raw)
      return Response.json(health, {
        status: health.status === 'down' ? 503 : 200,
      })
    }

    if (url.pathname === '/' || url.pathname === '') {
      const raw = await env.STATUS_KV.get('system-health')
      const health: SystemHealth | null = raw ? JSON.parse(raw) : null
      return new Response(renderDashboard(health), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    return new Response('Not Found', { status: 404 })
  },

  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const servicesRaw = await env.STATUS_KV.get('services')
    if (!servicesRaw) return

    const services: Array<{ name: string; url: string }> = JSON.parse(servicesRaw)
    const checks: Record<string, { status: CheckStatus; latencyMs?: number; checkedAt: string }> = {}
    let worstStatus: CheckStatus = 'operational'

    for (const service of services) {
      const start = Date.now()
      try {
        const res = await fetch(service.url, { method: 'GET' })
        const latencyMs = Date.now() - start
        const status: CheckStatus = res.ok ? 'operational' : 'down'
        checks[service.name] = { status, latencyMs, checkedAt: new Date().toISOString() }
        if (status === 'down') worstStatus = 'down'
      } catch {
        checks[service.name] = {
          status: 'down',
          latencyMs: Date.now() - start,
          checkedAt: new Date().toISOString(),
        }
        worstStatus = 'down'
      }
    }

    const health: SystemHealth = {
      status: worstStatus,
      checks: checks as SystemHealth['checks'],
      timestamp: new Date().toISOString(),
    }

    await env.STATUS_KV.put('system-health', JSON.stringify(health), { expirationTtl: 300 })
  },
}

function renderDashboard(health: SystemHealth | null): string {
  const status = health?.status ?? 'operational'
  const statusColor = status === 'operational' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : '#ef4444'

  let checksHtml = '<p style="color:#666">No checks recorded yet.</p>'
  if (health?.checks && Object.keys(health.checks).length > 0) {
    checksHtml = Object.entries(health.checks)
      .map(([name, check]) => {
        const c = check as { status: string; latencyMs?: number; checkedAt: string }
        const dot = c.status === 'operational' ? '🟢' : c.status === 'degraded' ? '🟡' : '🔴'
        return \`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee">
          <span>\${dot} \${name}</span>
          <span style="color:#666">\${c.latencyMs ? c.latencyMs + 'ms' : ''}</span>
        </div>\`
      })
      .join('')
  }

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Status</title>
  <style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 20px}</style>
</head>
<body>
  <h1>System Status</h1>
  <div style="background:\${statusColor};color:white;padding:16px;border-radius:8px;text-align:center;font-size:1.2em;margin-bottom:24px">
    \${status.charAt(0).toUpperCase() + status.slice(1)}
  </div>
  \${checksHtml}
  <p style="color:#999;margin-top:24px;font-size:0.85em">Last updated: \${health?.timestamp ?? 'Never'}</p>
</body>
</html>\`
}
`,
    )
  }
}

// ============================================================================
// REACT NATIVE APP SCAFFOLDING
// ============================================================================

/**
 * Creates a React Native app project using Metro bundler instead of Vite.
 * Supports both Expo and bare React Native workflows.
 */
export async function createReactNativeAppProject(
  projectPath: string,
  projectName: string,
  extraVars: Record<string, string> = {},
  _selectedPackages: string[] = [],
  _buildTooling?: BuildTooling,
): Promise<void> {
  const toolchain = loadToolchain()
  const appFrameworks = loadAppFrameworks()
  const fwConfig = appFrameworks['react-native'] ?? { dependencies: {}, devDependencies: {} }

  await mkdir(projectPath, { recursive: true })
  await mkdir(join(projectPath, 'src'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'bonds'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'screens'), { recursive: true })
  await mkdir(join(projectPath, 'src', 'components'), { recursive: true })
  await mkdir(join(projectPath, 'assets'), { recursive: true })

  // ---- package.json ----
  const deps: Record<string, string> = {
    ...(fwConfig.dependencies || {}),
    ...Object.fromEntries(
      _selectedPackages
        .filter((p) => p.startsWith('@molecule/'))
        .map((p) => [p, getMoleculeVersion(p)]),
    ),
  }

  const devDeps: Record<string, string> = {
    ...(fwConfig.devDependencies || {}),
    typescript: toolchain?.shared?.typescript || '6.0.3',
  }

  const pkgJson = {
    name: projectName,
    version: '0.0.1',
    private: true,
    main: 'index.js',
    scripts: {
      start: 'expo start',
      ios: 'expo run:ios',
      android: 'expo run:android',
      build: 'tsc --noEmit',
      test: 'jest',
    },
    dependencies: deps,
    devDependencies: devDeps,
    molecule: {
      projectType: 'app',
      framework: 'react-native',
    },
  }

  await writeFile(join(projectPath, 'package.json'), JSON.stringify(pkgJson, null, 2) + '\n')

  // ---- tsconfig.json (framework-driven from registry) ----
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      declaration: true,
      sourceMap: true,
      outDir: './dist',
      rootDir: '.',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      lib: ['ES2022'],
      ...(fwConfig.tsconfig ?? {}),
    },
    include: ['src/**/*', '*.ts', '*.tsx'],
    exclude: ['node_modules', 'dist'],
  }

  await writeFile(join(projectPath, 'tsconfig.json'), formatJson(tsconfig))

  // ---- app.json (Expo config) ----
  const appJson = {
    expo: {
      name: projectName,
      slug: projectName,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: `dev.molecule.${projectName.replace(/[^a-zA-Z0-9]/g, '')}`,
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#ffffff',
        },
        package: `dev.molecule.${projectName.replace(/[^a-zA-Z0-9]/g, '')}`,
      },
    },
  }

  await writeFile(join(projectPath, 'app.json'), JSON.stringify(appJson, null, 2) + '\n')

  // ---- metro.config.js ----
  await writeFile(
    join(projectPath, 'metro.config.js'),
    `const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Support npm workspace symlinks for @molecule/* packages
const workspaceRoot = path.resolve(__dirname, '../..')
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

module.exports = withNativeWind(config, { input: './src/global.css' })
`,
  )

  // ---- babel.config.js ----
  await writeFile(
    join(projectPath, 'babel.config.js'),
    `module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  }
}
`,
  )

  // ---- nativewind-env.d.ts ----
  await writeFile(
    join(projectPath, 'nativewind-env.d.ts'),
    `/// <reference types="nativewind/types" />\n`,
  )

  // ---- global.css (Tailwind directives for NativeWind) ----
  await writeFile(
    join(projectPath, 'src', 'global.css'),
    `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
  )

  // ---- tailwind.config.js ----
  await writeFile(
    join(projectPath, 'tailwind.config.js'),
    `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
}
`,
  )

  // ---- index.js (entry point) ----
  await writeFile(
    join(projectPath, 'index.js'),
    `import { registerRootComponent } from 'expo'
import { App } from './src/App'

registerRootComponent(App)
`,
  )

  // ---- src/App.tsx ----
  await writeFile(
    join(projectPath, 'src', 'App.tsx'),
    `import './global.css'

import React from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { t } from '@molecule/app-i18n'
import { setupBonds } from './bonds/index.js'
import { HomeScreen } from './screens/Home.js'

// Initialize bonds
setupBonds()

const Stack = createNativeStackNavigator()

export function App(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: t('nav.home', undefined, { defaultValue: 'Home' }) }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
`,
  )

  // ---- src/screens/Home.tsx ----
  await writeFile(
    join(projectPath, 'src', 'screens', 'Home.tsx'),
    `import React from 'react'
import { Text, View } from 'react-native'
import { getClassMap } from '@molecule/app-ui'
import { t } from '@molecule/app-i18n'

export function HomeScreen(): React.ReactElement {
  const cm = getClassMap()

  return (
    <View className={cm.cn(cm.flex1, cm.center, cm.page)}>
      <Text className={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
        {t('home.welcome', { name: '${projectName}' }, { defaultValue: 'Welcome to ${projectName}' })}
      </Text>
      <Text className={cm.cn(cm.sp('mt', 2), cm.textMuted)}>
        {t('home.subtitle', undefined, { defaultValue: 'Built with molecule.dev' })}
      </Text>
    </View>
  )
}
`,
  )

  // ---- src/bonds/index.ts ----
  // Copy shared bonds template if it exists, otherwise create a minimal one
  try {
    const bondsTemplate = await loadTemplate('app/shared/bonds-index.ts.tpl', {
      ...extraVars,
      PROJECT_NAME: projectName,
    })
    await writeFile(join(projectPath, 'src', 'bonds', 'index.ts'), bondsTemplate)
  } catch (_error) {
    // Safe fallback: bonds-index.ts.tpl missing (e.g. during dev); write a minimal stub instead
    await writeFile(
      join(projectPath, 'src', 'bonds', 'index.ts'),
      `/**
 * Bond initialization for ${projectName}.
 *
 * Import and wire all bonds at app startup.
 */

export function setupBonds(): void {
  // Bond initialization will be added here by mlcl
}
`,
    )
  }

  // ---- .gitignore ----
  await writeFile(
    join(projectPath, '.gitignore'),
    `node_modules/
dist/
${ENV_SECRETS_GITIGNORE}
.expo/
ios/
android/
*.tsbuildinfo

# molecule.dev platform runtime markers written into the project root by the
# sandbox (.mol-install-*, .mol-boot-timeline.log, ...) — never project source
.mol-*
`,
  )
}
