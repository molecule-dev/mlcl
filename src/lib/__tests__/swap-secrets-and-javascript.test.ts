/**
 * `mlcl swap` after the provider changes:
 * - the startup's `resolveAll([...])` list follows the swap — `resolveAll` copies only the
 *   keys it names from `.env` into `process.env`, so the new provider started without its key;
 * - the provider to replace is the one `setupBonds()` wires, not every provider the manifest
 *   declares (a scaffold also declares the capture provider its bundle imports);
 * - a JavaScript project's `.js` / `.mjs` bond files (as `mlcl inject` writes them there) are
 *   swapped like TypeScript ones.
 *
 * @module
 */
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import Swap from '../../commands/swap.js'
import { swapResolvedSecrets } from '../extend-api-wiring.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let config: Config
let dir: string | null = null
beforeAll(async () => {
  config = await Config.load(MLCL_ROOT)
})
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function swap(path: string): Promise<void> {
  const cwd = process.cwd()
  process.chdir(path)
  try {
    await Swap.run(
      ['@molecule/api-emails-sendgrid', '--no-interactive', '--no-install', '--no-format'],
      config,
    )
  } finally {
    process.chdir(cwd)
  }
}

async function project(manifest: object, files: Record<string, string>): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-'))
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  return dir
}

describe('mlcl swap (OLD MUSTFAIL)', () => {
  it('moves the resolved keys to the new provider and picks the wired provider without --replace', async () => {
    const path = await project(
      {
        name: 'demo-api',
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: {
          '@molecule/api-emails-capture': '1.0.0',
          '@molecule/api-emails-mailgun': '1.0.0',
          '@molecule/api-secrets-env': '1.0.0',
        },
      },
      {
        'src/bonds/index.ts':
          "import { resolveAll } from '@molecule/api-secrets'\n\n" +
          "import { setupEmailsMailgun } from './emails-mailgun.js'\n\n" +
          'export async function setupBonds(): Promise<void> {\n' +
          "  await resolveAll(['DATABASE_URL', 'MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_API_HOST'])\n" +
          '  setupEmailsMailgun()\n}\n',
        'src/bonds/emails-mailgun.ts': 'export function setupEmailsMailgun(): void {}\n',
      },
    )
    await swap(path)
    const index = await readFile(join(path, 'src/bonds/index.ts'), 'utf8')
    expect(index).toContain('setupEmailsSendgrid()')
    expect(index).toContain("'SENDGRID_API_KEY'")
    expect(index).toContain("'DATABASE_URL'")
    expect(index).not.toContain('MAILGUN_API_KEY')
  })

  it('swaps the .mjs bond files inject writes in a CommonJS project', async () => {
    const path = await project(
      { name: 'cjs', dependencies: { '@molecule/api-emails-mailgun': '1.0.0' } },
      {
        'src/bonds/index.mjs':
          "import { setupEmailsMailgun } from './emails-mailgun.mjs'\n" +
          'export async function setupBonds() {\n  setupEmailsMailgun()\n}\n',
        'src/bonds/emails-mailgun.mjs': 'export function setupEmailsMailgun() {}\n',
      },
    )
    await swap(path)
    const index = await readFile(join(path, 'src/bonds/index.mjs'), 'utf8')
    expect(index).toContain("import { setupEmailsSendgrid } from './emails-sendgrid.mjs'")
    const bond = await readFile(join(path, 'src/bonds/emails-sendgrid.mjs'), 'utf8')
    expect(bond).toContain('export function setupEmailsSendgrid()')
    expect(bond).not.toMatch(/\):\s*void/)
    expect(existsSync(join(path, 'src/bonds/emails-mailgun.mjs'))).toBe(false)
    expect(existsSync(join(path, 'src/bonds/emails-sendgrid.ts'))).toBe(false)
  })
})

describe('swapResolvedSecrets', () => {
  it('leaves a bare resolveAll() and an aliased one with other keys alone', () => {
    const bare = "import { resolveAll } from '@molecule/api-secrets'\nawait resolveAll()\n"
    expect(swapResolvedSecrets(bare, ['A'], ['B'])).toBe(bare)
    const other = "import { resolveAll as load } from '@molecule/api-secrets'\nawait load(['C'])\n"
    expect(swapResolvedSecrets(other, ['A'], ['B'])).toBe(
      "import { resolveAll as load } from '@molecule/api-secrets'\nawait load(['C', 'B'])\n",
    )
  })

  it('keeps a key both providers use', () => {
    const source =
      "import { resolveAll } from '@molecule/api-secrets'\nawait resolveAll(['SHARED', 'OLD'])\n"
    expect(swapResolvedSecrets(source, ['SHARED', 'OLD'], ['SHARED', 'NEW'])).toContain(
      "resolveAll(['SHARED', 'NEW'])",
    )
  })
})
