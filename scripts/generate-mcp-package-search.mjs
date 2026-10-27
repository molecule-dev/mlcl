#!/usr/bin/env node
/**
 * Regenerate the hosted MCP's standalone copy of the canonical package-search
 * owner (`src/lib/package-search.ts`).
 *
 * WHY A COPY EXISTS: the hosted server must build and deploy from `mcp/` alone
 * — `mcp/Dockerfile` builds that package, and `mcp/scripts/deploy-remote.sh`
 * ships only `mcp/src`, `mcp/assets` and the two catalogs — so it cannot import
 * the CLI's module graph, oclif, `node:fs` or a `@molecule/*` package. Copying
 * the owner verbatim keeps ONE scoring/filtering/DTO implementation while
 * keeping that closure intact.
 *
 * The owner is deliberately pure (no imports), which is what makes a verbatim
 * copy correct. `src/lib/__tests__/mcp-search-owner-drift.test.ts` fails when
 * the committed copy and this generator's output diverge, so a CLI search
 * improvement cannot silently miss the hosted transport.
 *
 * Usage (from the mlcl root): node scripts/generate-mcp-package-search.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Canonical owner — pure, so it can be copied verbatim. */
export const OWNER_PATH = join(MLCL_ROOT, 'src', 'lib', 'package-search.ts')

/** Generated standalone copy shipped inside the hosted server's build context. */
export const GENERATED_PATH = join(MLCL_ROOT, 'mcp', 'src', 'package-search.ts')

/**
 * The generated file's banner. It is separate from the owner's own module JSDoc
 * so the copy explains its provenance to a reader who opens it first.
 */
const HEADER = `// GENERATED FILE — DO NOT EDIT.
//
// Byte-for-byte copy of \`mlcl/src/lib/package-search.ts\` (the canonical search
// owner shared with \`mlcl search\` and the stdio MCP), made standalone so this
// package keeps its own build/deploy closure: mcp/Dockerfile builds \`mcp/\`
// alone and mcp/scripts/deploy-remote.sh ships only this package, so this file
// must not import the CLI, oclif, node:fs or any @molecule/* package.
//
// Regenerate after ANY edit to the owner:
//   node scripts/generate-mcp-package-search.mjs
// Drift fails src/lib/__tests__/mcp-search-owner-drift.test.ts.

`

/**
 * The exact text the committed generated file must contain.
 *
 * @param ownerSource - Contents of {@link OWNER_PATH}.
 * @returns The generated file's full text.
 */
export function renderGeneratedPackageSearch(ownerSource) {
  return HEADER + ownerSource
}

function main() {
  const ownerSource = readFileSync(OWNER_PATH, 'utf8')
  writeFileSync(GENERATED_PATH, renderGeneratedPackageSearch(ownerSource))
  console.log(`regenerated ${GENERATED_PATH} from ${OWNER_PATH}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
