/**
 * Activity capture in a molecule.dev project is one package, `@molecule/api-activity-capture`.
 *
 * - A generated bonds index awaits the package's `setupLast` function after every other bond,
 *   whenever the package is installed, so `mlcl create --activity-capture` and a later
 *   `mlcl add @molecule/api-activity-capture` write the same index, and a provider added after it
 *   is still wired above the call.
 * - A flagship's bonds index is copied, not generated: `injectActivityCaptureBoot` adds the import,
 *   the call and the dependency to the copy, and moves an index that imports the
 *   `_activity-capture.ts` module older scaffolds generated onto the package.
 *
 * What the call does at runtime is tested in the package itself.
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { disableAI } from '../ai.js'
import { generateBondsIndexContent, synthesizeProjectFiles } from '../injector.js'
import { missingMoleculePeers } from '../peer-closure.js'
import { loadRegistry } from '../registry.js'
import { injectActivityCaptureBoot } from '../scaffold.js'

const CAPTURE = '@molecule/api-activity-capture'

/** The shape every flagship's hand-curated `bonds/index.ts` has. */
const FIXTURE_BONDS_INDEX = `import { resolveAll } from '@molecule/api-secrets'

import { setupEmailsMailgun } from './emails-mailgun.js'

/**
 * Initialize all providers and service bonds.
 */
export async function setupBonds(): Promise<void> {
  await resolveAll(['MAILGUN_API_KEY'])
  setupEmailsMailgun()
}
`

/** The body of `setupBonds()`, one statement per line. */
function setupBondsBody(index: string): string[] {
  const start = index.indexOf('export async function setupBonds(): Promise<void> {')
  const end = index.indexOf('\n}', start)
  return index
    .slice(start, end)
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
}

describe('the generated API bonds index', () => {
  const registry = loadRegistry()
  const mailgun = {
    providerPackage: '@molecule/api-emails-mailgun',
  } as Parameters<typeof generateBondsIndexContent>[0][number]

  it('awaits the capture setup last when the package is installed', () => {
    const index = generateBondsIndexContent(
      [mailgun],
      [],
      [],
      ['@molecule/api-secrets', '@molecule/api-emails-mailgun', CAPTURE],
      registry,
    )
    expect(index).toContain(`import { setupActivityCapture } from '${CAPTURE}'`)
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
  })

  it('stays last when a provider is added after it', () => {
    const smtp = { providerPackage: '@molecule/api-emails-smtp' } as typeof mailgun
    const index = generateBondsIndexContent(
      [mailgun, smtp],
      [],
      [],
      [
        '@molecule/api-secrets',
        '@molecule/api-emails-mailgun',
        CAPTURE,
        '@molecule/api-emails-smtp',
      ],
      registry,
    )
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
  })

  // Counterexample: a project made outside molecule.dev, which does not have the package.
  it('has no capture call without the package', () => {
    const index = generateBondsIndexContent(
      [mailgun],
      [],
      [],
      ['@molecule/api-secrets', '@molecule/api-emails-mailgun'],
      registry,
    )
    expect(index).not.toContain('setupActivityCapture')
  })

  // A project from before the package: the regenerated index keeps awaiting its own module.
  it('awaits a project module passed as a local last setup', () => {
    const index = generateBondsIndexContent(
      [mailgun],
      [],
      [],
      ['@molecule/api-secrets', '@molecule/api-emails-mailgun'],
      registry,
      [{ exportName: 'setupActivityCapture', from: './_activity-capture.js' }],
    )
    expect(index).toContain("import { setupActivityCapture } from './_activity-capture.js'")
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
  })

  it('awaits it in an API with no providers too', () => {
    const index = generateBondsIndexContent([], [], [], [CAPTURE], registry)
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
  })
})

// `mlcl inject` regenerates an API's bonds index whole. A project created before the package
// awaits the module an older mlcl generated; the regeneration used to drop that call.
describe('an inject of a project with the older generated module', () => {
  let apiDir: string
  const modulePath = (): string => join(apiDir, 'src', 'bonds', '_activity-capture.ts')
  const plan = async (
    molecules: string[],
  ): Promise<Awaited<ReturnType<typeof synthesizeProjectFiles>>> =>
    synthesizeProjectFiles([], molecules, apiDir, loadRegistry(), 'express', { smokeTests: false })
  const bondsIndex = (files: Awaited<ReturnType<typeof synthesizeProjectFiles>>): string =>
    String(files.find((f) => f.targetPath === join(apiDir, 'src', 'bonds', 'index.ts'))?.content)

  beforeEach(() => {
    disableAI()
    apiDir = mkdtempSync(join(tmpdir(), 'mlcl-legacy-capture-'))
    mkdirSync(join(apiDir, 'src', 'bonds'), { recursive: true })
    writeFileSync(modulePath(), 'export async function setupActivityCapture() {}\n')
    writeFileSync(join(apiDir, 'package.json'), JSON.stringify({ name: 'demo-api' }))
  })
  afterEach(() => rmSync(apiDir, { recursive: true, force: true }))

  it('keeps awaiting the module last while the package is not installed', async () => {
    const files = await plan(['@molecule/api-secrets'])
    const index = bondsIndex(files)
    expect(index).toContain("import { setupActivityCapture } from './_activity-capture.js'")
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
    expect(files.some((f) => f.action === 'delete')).toBe(false)
  })

  it('awaits the package and deletes the module once the package is installed', async () => {
    const files = await plan(['@molecule/api-secrets', CAPTURE])
    const index = bondsIndex(files)
    expect(index).not.toContain('./_activity-capture.js')
    expect(index.match(/await setupActivityCapture\(\)/g)).toHaveLength(1)
    expect(files.filter((f) => f.action === 'delete').map((f) => f.targetPath)).toEqual([
      modulePath(),
    ])
  })

  // Counterexample: a project without the module gets no capture call from it.
  it('adds nothing for a project that never had the module', async () => {
    rmSync(modulePath())
    const files = await plan(['@molecule/api-secrets'])
    expect(bondsIndex(files)).not.toContain('setupActivityCapture')
    expect(files.some((f) => f.action === 'delete')).toBe(false)
  })
})

describe('injectActivityCaptureBoot (a copied flagship API)', () => {
  let apiDir: string
  const indexPath = (): string => join(apiDir, 'src', 'bonds', 'index.ts')
  const manifest = (): { dependencies: Record<string, string> } =>
    JSON.parse(readFileSync(join(apiDir, 'package.json'), 'utf-8')) as {
      dependencies: Record<string, string>
    }

  beforeEach(() => {
    apiDir = mkdtempSync(join(tmpdir(), 'mlcl-activity-capture-'))
    mkdirSync(join(apiDir, 'src', 'bonds'), { recursive: true })
    writeFileSync(indexPath(), FIXTURE_BONDS_INDEX)
    writeFileSync(
      join(apiDir, 'package.json'),
      JSON.stringify({ name: 'demo-api', dependencies: { '@molecule/api-secrets': '1.0.0' } }),
    )
  })
  afterEach(() => rmSync(apiDir, { recursive: true, force: true }))

  it('imports the package, awaits its setup last and declares it, once', async () => {
    expect(await injectActivityCaptureBoot(apiDir)).toBe(true)
    const index = readFileSync(indexPath(), 'utf-8')
    expect(index).toContain(`import { setupActivityCapture } from '${CAPTURE}'`)
    expect(setupBondsBody(index).at(-1)).toBe('await setupActivityCapture()')
    expect(manifest().dependencies[CAPTURE]).toMatch(/^\d+\.\d+\.\d+$/)
    // Nothing generated beside the index.
    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(false)

    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)
    expect(readFileSync(indexPath(), 'utf-8')).toBe(index)
  })

  it('declares the cores the package peers on, which --legacy-peer-deps would not install', async () => {
    await injectActivityCaptureBoot(apiDir)
    expect(missingMoleculePeers(Object.keys(manifest().dependencies))).toEqual([])
    expect(manifest().dependencies['@molecule/api-bond']).toBeDefined()
  })

  it('moves an index that imports the old generated module onto the package', async () => {
    const legacy = FIXTURE_BONDS_INDEX.replace(
      "import { setupEmailsMailgun } from './emails-mailgun.js'\n",
      "import { setupActivityCapture } from './_activity-capture.js'\nimport { setupEmailsMailgun } from './emails-mailgun.js'\n",
    ).replace(
      '  setupEmailsMailgun()\n',
      '  setupEmailsMailgun()\n  await setupActivityCapture()\n',
    )
    writeFileSync(indexPath(), legacy)
    writeFileSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'), 'export {}\n')

    expect(await injectActivityCaptureBoot(apiDir)).toBe(true)
    const index = readFileSync(indexPath(), 'utf-8')
    expect(index).not.toContain('./_activity-capture.js')
    expect(index).toContain(`import { setupActivityCapture } from '${CAPTURE}'`)
    expect(index.match(/await setupActivityCapture\(\)/g)).toHaveLength(1)
    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(false)
    expect(manifest().dependencies[CAPTURE]).toBeDefined()
  })

  it('leaves an API without setupBonds or without a manifest alone', async () => {
    writeFileSync(indexPath(), 'export const nothing = 1\n')
    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)
    expect(manifest().dependencies[CAPTURE]).toBeUndefined()

    writeFileSync(indexPath(), FIXTURE_BONDS_INDEX)
    rmSync(join(apiDir, 'package.json'))
    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)
    expect(readFileSync(indexPath(), 'utf-8')).toBe(FIXTURE_BONDS_INDEX)
  })
})
