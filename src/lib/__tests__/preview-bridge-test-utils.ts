/**
 * Shared fixture helper for the preview-bridge suites.
 *
 * The bridges are no longer inlined into the entry document: each one is written
 * to `<publicDir>/__mol/bridges/<name>.js` and the document carries a two-line
 * reference (`<!-- mol:<name> -->` + `<script src=…>`). That is a change of
 * WHERE the bytes live, not of what the page does — the browser still executes
 * the same script, at the same point in the document (a classic blocking
 * `<script src>` runs in document order, exactly as an inline `<script>` did).
 *
 * A test that runs the scaffolded document in jsdom must therefore put those
 * files back inline FIRST, because jsdom does not fetch subresources. Reading
 * them from the project the injector actually wrote to keeps the behavioural
 * assertions meaningful: what the tests execute is byte-for-byte what a browser
 * would execute, and a missing or empty asset file fails the read loudly instead
 * of quietly disabling the bridge.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** A bridge reference written by the scaffold injectors. */
const BRIDGE_REFERENCE = /<script src="\/__mol\/bridges\/([a-z0-9-]+)\.js"><\/script>/g

/**
 * Replace every bridge reference in `html` with the script it loads.
 *
 * @param html - The scaffolded entry document.
 * @param appDir - The app directory the injectors wrote into (the document's parent).
 * @param publicDir - The app's static dir; `public` unless the framework says otherwise.
 * @returns The document with each referenced bridge inlined, as a browser would run it.
 */
export function inlinePreviewBridgeScripts(
  html: string,
  appDir: string,
  publicDir = 'public',
): string {
  return html.replace(
    BRIDGE_REFERENCE,
    (_match, name: string) =>
      `<script>${readFileSync(join(appDir, publicDir, '__mol', 'bridges', `${name}.js`), 'utf-8')}</script>`,
  )
}
