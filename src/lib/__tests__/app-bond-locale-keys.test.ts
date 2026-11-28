/**
 * The app translation types read each installed locale bond's keys by running its `./loader.js`.
 * A copy found through the registry path can be an unbuilt source checkout (mlcl's CI clones
 * molecule and never builds it), where that file does not exist yet.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { appBondLocaleKeys } from '../app-locales.js'

const name = '@molecule/app-locales-example'
let root: string

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mlcl-bond-locale-keys-'))
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ name, exports: { './loader.js': { import: './dist/loader.js' } } }),
  )
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('appBondLocaleKeys', () => {
  it('names the fix when the copy it found has no built loader', async () => {
    await expect(appBondLocaleKeys(['en'], [name], async () => root)).rejects.toThrow(
      `${name} at ${root} has no dist/loader.js: install the package (npm install) or build that copy`,
    )
  })

  it('reads the keys a built loader serves for each locale', async () => {
    await mkdir(join(root, 'dist'))
    await writeFile(
      join(root, 'dist', 'loader.js'),
      `export async function loadLocaleModule(locale) {
  return locale === 'en' ? { 'example.save': 'Save', 'example.count': 3 } : undefined
}
`,
    )
    const keys = await appBondLocaleKeys(['en', 'fr'], [name], async () => root)
    expect([...(keys.get('en') ?? [])]).toEqual(['example.save'])
    expect([...(keys.get('fr') ?? [])]).toEqual([])
  })
})
