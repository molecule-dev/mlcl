// @vitest-environment node
/**
 * The hosted MCP ranks, stack-filters and shapes discovery hits with the SAME
 * implementation as `mlcl search` — through a generated standalone copy.
 *
 * The hosted server must build and deploy from `mcp/` alone (`mcp/Dockerfile`,
 * `mcp/scripts/deploy-remote.sh`), so it cannot import the CLI's module graph.
 * The alternative that shipped before this contract was a second, hand-written
 * scorer (`scoreEntry` in `mcp/src/remote.ts`): it had already drifted on the
 * public contract — no `stack` input, no stack filtering, and no `label` in the
 * result DTO — while its comment called itself "the canonical `mlcl search`
 * scoring contract".
 *
 * These controls fail if the copy is stale, if it stops being standalone, or
 * if the independent scorer is reintroduced.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const OWNER_PATH = join(MLCL_ROOT, 'src', 'lib', 'package-search.ts')
const GENERATED_PATH = join(MLCL_ROOT, 'mcp', 'src', 'package-search.ts')
const GENERATOR_PATH = join(MLCL_ROOT, 'scripts', 'generate-mcp-package-search.mjs')
const REMOTE_PATH = join(MLCL_ROOT, 'mcp', 'src', 'remote.ts')

describe('hosted MCP search owner is generated from the CLI owner', () => {
  it('the committed standalone copy is exactly what the generator writes', async () => {
    const { renderGeneratedPackageSearch } = await import(GENERATOR_PATH)
    const ownerSource = readFileSync(OWNER_PATH, 'utf8')
    expect(
      readFileSync(GENERATED_PATH, 'utf8'),
      'mcp/src/package-search.ts is stale — run `node scripts/generate-mcp-package-search.mjs`',
    ).toBe(renderGeneratedPackageSearch(ownerSource))
  })

  it('the standalone copy keeps the hosted build closure intact', () => {
    const generated = readFileSync(GENERATED_PATH, 'utf8')
    // No imports at all: the pure owner needs none, and any import would pull
    // the CLI/workspace graph into the image that ships only `mcp/`.
    expect(generated).not.toMatch(/^\s*(?:import|export\s+[^;]*\s+from)\s/m)
    // …and nothing in the CODE reaches a Node/filesystem/vendor/CLI surface.
    // Comments are stripped first: the banner and the owner's JSDoc name those
    // boundaries while explaining why the copy must not use them. (The
    // `'@molecule/'` string literal that strips the package scope is data, not
    // a dependency, so this checks module specifiers and globals.)
    const code = generated.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    expect(code).not.toMatch(/\bfrom\s*['"]/)
    expect(code).not.toMatch(/\bimport\s*\(|\brequire\s*\(/)
    expect(code).not.toMatch(/\bprocess\.(?:env|argv|exit)\b/)
    expect(code).not.toMatch(/\bnode:/)
  })

  it('the hosted server carries no second scorer', () => {
    const remote = readFileSync(REMOTE_PATH, 'utf8')
    expect(remote).toMatch(/from '\.\/package-search\.js'/)
    expect(
      remote,
      'a hand-maintained scorer under the hosted server drifts from `mlcl search` — import the generated owner instead',
    ).not.toMatch(/function\s+scoreEntry\b/)
  })

  it('the generated owner is committed in the hosted server’s build context', () => {
    // deploy-remote.sh copies `mcp/src`; the file must exist there (not only
    // in the workspace) or the image build has no search implementation.
    expect(existsSync(GENERATED_PATH)).toBe(true)
  })
})
