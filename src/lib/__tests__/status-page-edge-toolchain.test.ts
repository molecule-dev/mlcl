/**
 * `createStatusPageEdgeProject` has two branches: copy `templates/status-page-edge/`
 * if it exists, otherwise generate the Workers project INLINE. That directory does
 * not exist in this repo, so the inline branch is the live one — and it wrote the
 * toolchain by hand: `typescript: '6.0.3'`, `vitest: '4.1.10'`.
 *
 * Only vitest had drifted: the registry toolchain, mlcl's own package.json and
 * every flagship template pin 4.1.11. So `mlcl create x --type status-page-edge`
 * produced the one generated project in the fleet installing a different vitest —
 * the version split the toolchain section exists to prevent — and nothing noticed,
 * because no test called this function and the drift gate only knows the registry's
 * own section and the template fleet.
 *
 * The pins are now read from `loadToolchain()` (the same registry section the api
 * create path spreads), so this test fails as soon as a literal here falls behind
 * the fleet again. Driven through the real function against a temp directory.
 *
 * @module
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { loadToolchain } from '../registry.js'
import { createStatusPageEdgeProject } from '../scaffold.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-status-page-edge-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

interface EdgeManifest {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
}

/** Scaffold the edge status page into `dir` and read the manifest it wrote. */
async function scaffoldManifest(): Promise<EdgeManifest> {
  await createStatusPageEdgeProject(dir, 'probe-status')
  return JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as EdgeManifest
}

describe('status-page-edge scaffold — the toolchain pins come from the registry', () => {
  it('pins the registry toolchain’s typescript and vitest, never a drifted literal', async () => {
    const toolchain = loadToolchain()
    const manifest = await scaffoldManifest()
    const devDeps = manifest.devDependencies ?? {}

    // Non-vacuity: the branch that ran wrote the Workers project's own manifest.
    expect(Object.keys(devDeps).length).toBeGreaterThan(0)

    expect(devDeps.typescript).toBe(toolchain.shared.typescript)
    expect(devDeps.vitest).toBe(toolchain.api.vitest)
  })
})
