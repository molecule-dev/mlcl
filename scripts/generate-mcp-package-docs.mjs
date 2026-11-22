#!/usr/bin/env node
/**
 * Regenerate the MCP package's copies of mlcl's package-doc modules: reading an installed
 * package's README and type declarations, the bounded literal search over them, and the bounded
 * README view `mlcl docs` prints.
 *
 * The MCP package builds and deploys from `mcp/` alone (mcp/Dockerfile,
 * mcp/scripts/deploy-remote.sh), so it cannot import the CLI's modules; a verbatim copy keeps one
 * implementation. `src/lib/__tests__/mcp-doc-owner-drift.test.ts` fails when a committed copy and
 * this generator's output differ.
 *
 * Usage (from the mlcl root): node scripts/generate-mcp-package-docs.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The modules copied, by file name (the same in `src/lib/` and `mcp/src/`). */
export const DOC_MODULES = ['package-doc-files.ts', 'package-doc-search.ts', 'package-doc-view.ts']

/**
 * The exact text a committed copy must contain.
 *
 * @param file - The module's file name.
 * @param ownerSource - The owner's contents.
 * @returns The generated file's full text.
 */
export function renderGeneratedDocModule(file, ownerSource) {
  return `// GENERATED FILE — DO NOT EDIT.
//
// Byte-for-byte copy of \`mlcl/src/lib/${file}\`, made standalone so this package keeps its own
// build and deploy closure. Regenerate after ANY edit to the owner:
//   node scripts/generate-mcp-package-docs.mjs
// Drift fails src/lib/__tests__/mcp-doc-owner-drift.test.ts.

${ownerSource}`
}

/**
 * Where a module's owner and copy live.
 *
 * @param file - The module's file name.
 * @returns The two paths.
 */
export function docModulePaths(file) {
  return {
    owner: join(MLCL_ROOT, 'src', 'lib', file),
    generated: join(MLCL_ROOT, 'mcp', 'src', file),
  }
}

function main() {
  for (const file of DOC_MODULES) {
    const { owner, generated } = docModulePaths(file)
    writeFileSync(generated, renderGeneratedDocModule(file, readFileSync(owner, 'utf8')))
    console.log(`regenerated ${generated}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
