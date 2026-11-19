/**
 * The module a generated app's `index.html` loads. Tests that swap in a small app of their own
 * replace this file, so they keep working whichever module the framework's template uses as its
 * entry (React's `src/bootstrap.tsx`, the others' `src/main.<ext>`).
 *
 * @module
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Read the entry module from a generated app's `index.html`.
 *
 * @param root - The generated app's directory.
 * @returns The entry's path relative to `root` (`src/bootstrap.tsx`).
 */
export async function generatedEntry(root: string): Promise<string> {
  const html = await readFile(join(root, 'index.html'), 'utf8')
  const entry = /<script type="module" src="\/(src\/[^"]+)"/.exec(html)?.[1]
  if (!entry) throw new Error(`${join(root, 'index.html')} loads no module from src/`)
  return entry
}
