/**
 * Command-level integration test for `mlcl swap`.
 *
 * Regression coverage for the ADV1 audit finding: the original swap rewrote
 * `bonds/index.ts` with an exact-format regex against a hardcoded `src/bonds`
 * path, then deleted the old bond file regardless of whether the rewrite matched.
 * On any deviation (a flat hand-written index, or a framework whose bonds live
 * under a shared-code subdir like SvelteKit's `src/lib`) it silently no-op'd the
 * rewrite, deleted the old bond anyway, and reported a green "success" — leaving
 * `index.ts` importing a now-missing module (a project that no longer compiles).
 *
 * These tests run the REAL `Swap` command against real on-disk flat projects and
 * assert the file-system outcome (the wiring), which is what was never tested.
 * Bond-setup code is generated from the real molecule package sources via the
 * registry, so no symlinks are needed in the temp project.
 *
 * @module
 */

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import Swap from '../../commands/swap.js'
import { applyBondSwap, BondSwapError } from '../integrate.js'
import { loadRegistry } from '../registry.js'

// mlcl package root: <root>/src/lib/__tests__/swap.test.ts
const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

// A real non-db swap: two providers of the same (@molecule/api-emails) interface.
const OLD_PKG = '@molecule/api-emails-mailgun'
const NEW_PKG = '@molecule/api-emails-sendgrid'
const INTERFACE = '@molecule/api-emails'

let config: Config

const exists = async (p: string): Promise<boolean> =>
  access(p)
    .then(() => true)
    .catch(() => false)

/** Run the real Swap command from within `dir`; never throws — returns the exit error if any. */
async function runSwap(dir: string, newPkg: string): Promise<{ error: unknown }> {
  const orig = process.cwd()
  process.chdir(dir)
  try {
    await Swap.run([newPkg, '--no-interactive', '--no-install', '--no-format'], config)
    return { error: undefined }
  } catch (error) {
    return { error }
  } finally {
    process.chdir(orig)
  }
}

/**
 * Assert no `from './X.js'` import in the bonds index points at a missing file —
 * i.e. the exact "deleted the module that index.ts still imports" condition the
 * original swap shipped. A dangling relative import is precisely what fails tsc.
 */
async function assertNoDanglingRelativeImports(bondsDir: string): Promise<void> {
  const index = await readFile(join(bondsDir, 'index.ts'), 'utf-8')
  const rels = [...index.matchAll(/from\s+['"]\.\/([\w-]+)\.js['"]/g)].map((m) => m[1])
  for (const name of rels) {
    expect(await exists(join(bondsDir, `${name}.ts`)), `dangling import './${name}.js'`).toBe(true)
  }
}

/** Scaffold a minimal flat project with a generated-format bonds index wiring the old bond. */
async function scaffoldProject(opts: {
  bondsRel: string[] // path segments under the project to the bonds dir
  molecule?: Record<string, unknown>
  indexContent: string
}): Promise<{ dir: string; bondsDir: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-test-'))
  const bondsDir = join(dir, ...opts.bondsRel)
  await mkdir(bondsDir, { recursive: true })
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name: 'flat-app',
        version: '1.0.0',
        type: 'module',
        molecule: opts.molecule ?? { projectType: 'api' },
        dependencies: { [INTERFACE]: '1.0.0', [OLD_PKG]: '1.0.0' },
      },
      null,
      2,
    ) + '\n',
  )
  await writeFile(
    join(bondsDir, 'emails-mailgun.ts'),
    `import { setTransport } from '${INTERFACE}'\n` +
      `import { provider } from '${OLD_PKG}'\n` +
      `export function setupEmailsMailgun(): void {\n  setTransport(provider)\n}\n`,
  )
  await writeFile(join(bondsDir, 'index.ts'), opts.indexContent)
  return { dir, bondsDir }
}

const GENERATED_INDEX =
  `import { resolveAll } from '@molecule/api-secrets'\n` +
  `import { setupEmailsMailgun } from './emails-mailgun.js'\n\n` +
  `export async function setupBonds(): Promise<void> {\n` +
  `  await resolveAll()\n  setupEmailsMailgun()\n}\n`

beforeAll(async () => {
  config = await Config.load({ root: MLCL_ROOT })
})

const tempDirs: string[] = []
afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((d) => rm(d, { recursive: true, force: true })))
})

describe('mlcl swap — bonds/index rewrite + bondsDir derivation (ADV1)', () => {
  it('swaps a provider end-to-end in the default src/bonds layout', async () => {
    const { dir, bondsDir } = await scaffoldProject({
      bondsRel: ['src', 'bonds'],
      indexContent: GENERATED_INDEX,
    })
    tempDirs.push(dir)

    const { error } = await runSwap(dir, NEW_PKG)
    expect(error).toBeUndefined()

    // old bond removed, new bond created
    expect(await exists(join(bondsDir, 'emails-mailgun.ts'))).toBe(false)
    expect(await exists(join(bondsDir, 'emails-sendgrid.ts'))).toBe(true)

    // index rewired: imports + calls the NEW setup, no trace of the OLD one
    const index = await readFile(join(bondsDir, 'index.ts'), 'utf-8')
    expect(index).toContain(`import { setupEmailsSendgrid } from './emails-sendgrid.js'`)
    expect(index).toContain('setupEmailsSendgrid()')
    expect(index).not.toContain('setupEmailsMailgun')
    expect(index).not.toContain('./emails-mailgun.js')

    // the structural compile invariant the original swap violated
    await assertNoDanglingRelativeImports(bondsDir)

    // package.json: old dep gone, new dep pinned exactly (no range)
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies[OLD_PKG]).toBeUndefined()
    expect(pkg.dependencies[NEW_PKG]).toBeDefined()
    expect(pkg.dependencies[NEW_PKG]).not.toMatch(/[\^~]/)
  })

  it('ABORTS without deleting the old bond when the index format is not recognized', async () => {
    // The audit's exact failure mode: index.ts does NOT wire the old bond in the
    // expected format, so a regex rewrite is a no-op. The old swap deleted the
    // bond anyway and reported success; the fix must abort with the project intact.
    const { dir, bondsDir } = await scaffoldProject({
      bondsRel: ['src', 'bonds'],
      indexContent: `export async function setupBonds(): Promise<void> {\n  /* hand-wired elsewhere */\n}\n`,
    })
    tempDirs.push(dir)

    const { error } = await runSwap(dir, NEW_PKG)

    // command exited non-zero
    expect(error).toBeDefined()
    expect((error as { oclif?: { exit?: number } }).oclif?.exit).toBe(1)

    // NOTHING was mutated — old bond preserved, new bond never written
    expect(await exists(join(bondsDir, 'emails-mailgun.ts'))).toBe(true)
    expect(await exists(join(bondsDir, 'emails-sendgrid.ts'))).toBe(false)

    // package.json untouched (old dep still present, new dep absent)
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
    expect(pkg.dependencies[OLD_PKG]).toBe('1.0.0')
    expect(pkg.dependencies[NEW_PKG]).toBeUndefined()
  })

  it('targets the framework shared-code subdir (svelte → src/lib/bonds), not src/bonds', async () => {
    const { dir, bondsDir } = await scaffoldProject({
      bondsRel: ['src', 'lib', 'bonds'],
      molecule: { projectType: 'app', framework: 'svelte' },
      indexContent: GENERATED_INDEX,
    })
    tempDirs.push(dir)

    // a decoy default-layout bonds dir that must be left untouched
    const decoyDir = join(dir, 'src', 'bonds')
    await mkdir(decoyDir, { recursive: true })
    await writeFile(join(decoyDir, 'emails-mailgun.ts'), 'DECOY\n')

    const { error } = await runSwap(dir, NEW_PKG)
    expect(error).toBeUndefined()

    // operated on src/lib/bonds
    expect(await exists(join(bondsDir, 'emails-sendgrid.ts'))).toBe(true)
    expect(await exists(join(bondsDir, 'emails-mailgun.ts'))).toBe(false)
    await assertNoDanglingRelativeImports(bondsDir)

    // never touched the decoy src/bonds
    expect((await readFile(join(decoyDir, 'emails-mailgun.ts'), 'utf-8')).trim()).toBe('DECOY')
  })
})

describe('applyBondSwap — abort + non-fatal warnings (ADV1 core)', () => {
  it('throws BondSwapError(index-no-match) and leaves the project untouched', async () => {
    const { dir, bondsDir } = await scaffoldProject({
      bondsRel: ['src', 'bonds'],
      indexContent: `export async function setupBonds(): Promise<void> {}\n`,
    })
    tempDirs.push(dir)

    const registry = [...loadRegistry('api'), ...loadRegistry('app')]
    const oldPkg = registry.find((p) => p.name === OLD_PKG)!
    const newPkg = registry.find((p) => p.name === NEW_PKG)!

    const thrown = await applyBondSwap({
      projectPath: dir,
      oldPkg,
      newPkg,
      newName: NEW_PKG,
      implementsInterface: INTERFACE,
      newVersion: '1.0.0',
    }).then(
      () => null,
      (e: unknown) => e,
    )
    expect(thrown).toBeInstanceOf(BondSwapError)
    expect((thrown as BondSwapError).code).toBe('index-no-match')

    // confirm the contract: nothing deleted/created
    expect(await exists(join(bondsDir, 'emails-mailgun.ts'))).toBe(true)
    expect(await exists(join(bondsDir, 'emails-sendgrid.ts'))).toBe(false)
  })

  it('reports callRewritten:false when the import is wired but the setup call is missing', async () => {
    // Import present (so the rewrite is safe + the old module is no longer
    // referenced) but no setup() call — the new provider compiles but is never
    // initialized, which the command surfaces as a warning rather than failing.
    const { dir, bondsDir } = await scaffoldProject({
      bondsRel: ['src', 'bonds'],
      indexContent:
        `import { setupEmailsMailgun } from './emails-mailgun.js'\n` +
        `// setupEmailsMailgun is registered lazily elsewhere\n` +
        `export async function setupBonds(): Promise<void> {}\n`,
    })
    tempDirs.push(dir)

    const registry = [...loadRegistry('api'), ...loadRegistry('app')]
    const oldPkg = registry.find((p) => p.name === OLD_PKG)!
    const newPkg = registry.find((p) => p.name === NEW_PKG)!

    const result = await applyBondSwap({
      projectPath: dir,
      oldPkg,
      newPkg,
      newName: NEW_PKG,
      implementsInterface: INTERFACE,
      newVersion: '1.0.0',
    })

    expect(result.callRewritten).toBe(false)
    // import was still rewired (no dangling reference to the deleted module)
    const index = await readFile(join(bondsDir, 'index.ts'), 'utf-8')
    expect(index).toContain(`import { setupEmailsSendgrid } from './emails-sendgrid.js'`)
    expect(index).not.toContain('./emails-mailgun.js')
    await assertNoDanglingRelativeImports(bondsDir)
  })
})
