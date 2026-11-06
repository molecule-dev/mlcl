import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { build } from 'vite'
import { afterEach, describe, expect, it } from 'vitest'

import { getMoleculeVersion } from '../registry.js'
import { createAppProject } from '../scaffold.js'

const roots: string[] = []
const require = createRequire(import.meta.url)
const installation = resolve(dirname(require.resolve('vite/package.json')), '..')
const packageName = '@molecule/app-vite-config-default'

async function app(present: boolean): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'scaffold-assets-'))
  roots.push(root)
  await createAppProject(root, 'clinic', 'react')
  await symlink(installation, join(root, 'node_modules'), 'dir')
  await writeFile(join(root, 'src/main.tsx'), 'document.body.dataset.logo = "/logo-clinic.png"')
  if (present) {
    await mkdir(join(root, 'public'), { recursive: true })
    await writeFile(join(root, 'public/logo-clinic.png'), 'image')
  }
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('generated custom apps validate their written assets', () => {
  it('declares the shared plugin package at its exact registry version', async () => {
    const root = await app(false)
    const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
    expect(manifest.devDependencies[packageName]).toBe(getMoleculeVersion(packageName))
  })

  it('fails a real generated Vite config with the source line for a missing clinic logo', async () => {
    const root = await app(false)
    await expect(build({ root, configLoader: 'runner', logLevel: 'silent' })).rejects.toThrow(
      'src/main.tsx:1 names "/logo-clinic.png", but the build output has no such file, so the browser gets the index.html fallback. Put it at public/logo-clinic.png, or import it from src.',
    )
  }, 30_000)

  it('builds the same generated app when the clinic logo ships in public', async () => {
    const root = await app(true)
    await build({ root, configLoader: 'runner', logLevel: 'silent' })
    expect(await readFile(join(root, 'dist/logo-clinic.png'), 'utf8')).toBe('image')
  }, 30_000)
})
