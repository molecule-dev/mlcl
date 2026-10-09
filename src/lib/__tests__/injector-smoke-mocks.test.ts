/**
 * The scaffold's server smoke test used to mock every non-resource
 * @molecule/* package as an EMPTY object. Core packages call
 * `expectBond(type)` at module scope, and since the Postgres migration
 * runner statically imports `createMigratorPglite` from
 * `@molecule/api-bonds-default-express` — whose graph loads those cores —
 * importing server.js (which imports the runner) crashed the scaffold's own
 * suite on `No "expectBond" export is defined on the "@molecule/api-bond"
 * mock`. Generated mocks must carry each package's registry export surface,
 * never an empty object.
 *
 * @module
 */

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import { synthesizeProjectFiles } from '../injector.js'

let dir: string | null = null
beforeAll(() => {
  // The heuristic generator is what ships deterministically; never let a
  // configured API key route this test through AI text generation.
  disableAI()
})
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('generated smoke-test mocks', () => {
  it('mocks @molecule/api-bond with its export surface, not an empty object', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-smoke-mocks-'))
    // api-bond rides along in the real flow as a peer of the database bond;
    // pass it explicitly here — the generator mocks exactly the given list.
    const files = await synthesizeProjectFiles(
      [],
      ['@molecule/api-database-postgresql', '@molecule/api-bond'],
      dir,
    )
    const serverTest = files.find((f) => f.targetPath.endsWith('__tests__/server.test.ts'))
    expect(serverTest).toBeDefined()
    // The empty mock is the exact shape that crashed on import…
    expect(serverTest!.content).not.toContain("vi.mock('@molecule/api-bond', () => ({}))")
    // …and the registry export surface is present instead: a module-scope
    // expectBond() call now resolves to a vi.fn().
    const bondMock = serverTest!.content.match(
      /vi\.mock\('@molecule\/api-bond', \(\) => \(\{[\s\S]*?\n\}\)\)/,
    )
    expect(bondMock?.[0]).toContain('expectBond: vi.fn(),')
    expect(bondMock?.[0]).toContain('isBonded: vi.fn(),')
  })

  it('mocks the migration runner — server.ts imports it, and its wrapper import drags every provider bond graph in', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-smoke-mocks-'))
    const files = await synthesizeProjectFiles([], ['@molecule/api-database-postgresql'], dir)
    const serverTest = files.find((f) => f.targetPath.endsWith('__tests__/server.test.ts'))
    expect(serverTest).toBeDefined()
    // Importing server.js pulls the runner, whose
    // @molecule/api-bonds-default-express import loads provider bonds that
    // call bond-core functions at module scope — the scaffold's own smoke
    // suite crashed on that chain before the runner was mocked here.
    expect(serverTest!.content).toContain(
      "vi.mock('../scripts/migrate.js', () => ({\n  runMigrations: vi.fn(),\n}))",
    )
  })

  it('asserts the bonds/index export surface against the REAL module, not the mock', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-smoke-mocks-'))
    const files = await synthesizeProjectFiles([], ['@molecule/api-database-postgresql'], dir)
    const serverTest = files.find((f) => f.targetPath.endsWith('__tests__/server.test.ts'))
    expect(serverTest).toBeDefined()
    // The mock header must stay: it shields server.ts's import of bonds/index.
    expect(serverTest!.content).toContain(
      "vi.mock('../bonds/index.js', () => ({\n  setupBonds: vi.fn(),\n}))",
    )
    // …but the suite's own bonds/index assertion must drive the REAL module.
    // It used to import the mocked path and assert `typeof ... === 'function'`
    // — an assertion that could never fail, so a generated bonds/index.ts that
    // did not export setupBonds (or failed to load) passed its own smoke suite
    // and crashed the server at boot instead.
    expect(serverTest!.content).toContain(
      "const bonds = (await vi.importActual('../bonds/index.js')) as Record<string, unknown>",
    )
    expect(serverTest!.content.match(/await import\('\.\.\/bonds\/index\.js'\)/)).toBeNull()
  })
})
