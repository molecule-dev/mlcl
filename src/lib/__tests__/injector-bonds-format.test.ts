import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as prettier from 'prettier'
import { describe, expect, it } from 'vitest'

import { generateBondSetupCode, generateBondsIndexContent } from '../injector.js'
import { loadRegistry } from '../registry.js'
import { getTemplatesDir } from '../scaffold.js'
import { InferredPackage } from '../schema.js'

/** Write a package with these named exports under `<root>/node_modules/<name>`. */
async function fixturePackage(root: string, name: string, exports: string[]): Promise<string> {
  const dir = join(root, 'node_modules', ...name.split('/'))
  await mkdir(join(dir, 'src'), { recursive: true })
  await writeFile(join(dir, 'package.json'), JSON.stringify({ name, version: '1.0.0' }))
  const body = exports.map((e) => `export const ${e} = (): void => {}\n`).join('')
  await writeFile(join(dir, 'src', 'index.ts'), body)
  return dir
}

describe('generated bond setup is a formatter fixed point', () => {
  it('wraps a bond file import that is longer than the print width (OLD MUSTFAIL)', async () => {
    // The Express body parser bonds three setters; one import line of them was 103 characters, and
    // the scaffold's own prettier rewrote the file.
    const root = await mkdtemp(join(tmpdir(), 'mlcl-bond-wrap-'))
    try {
      const core = '@molecule/api-fixture-request-decoding'
      const bond = '@molecule/api-fixture-request-decoding-express'
      await fixturePackage(root, core, [
        'setProvider',
        'setJsonDecoderFactory',
        'setMultipartUploadDecoderFactory',
      ])
      const exports = ['provider', 'jsonDecoderFactory', 'multipartUploadDecoderFactory']
      const path = await fixturePackage(root, bond, exports)
      const pkg = InferredPackage.parse({
        name: bond,
        version: '1.0.0',
        type: 'bond',
        path,
        exports,
      })
      const content = await generateBondSetupCode(pkg, 'request-decoding', core, root)
      expect(content).toContain('setMultipartUploadDecoderFactory(multipartUploadDecoderFactory)')
      const config = JSON.parse(
        await readFile(join(getTemplatesDir(), 'api', 'prettierrc.json.tpl'), 'utf8'),
      )
      expect(content).toBe(await prettier.format(content, { ...config, parser: 'typescript' }))
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each([0, 1, 8])('preserves %i secrets without a format rewrite', async (count) => {
    const names = Array.from({ length: count }, (_, index) => `PROVIDER_${index}_SECRET_KEY`)
    const content = generateBondsIndexContent(
      [
        {
          interfacePackage: '@molecule/api-secrets',
          providerPackage: '@molecule/api-secrets-env',
          interfaceType: 'secrets',
          setupCode: '',
        },
      ],
      [],
      names,
      ['@molecule/api-secrets', '@molecule/api-secrets-env'],
    )
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'api', 'prettierrc.json.tpl'), 'utf8'),
    )
    expect(content).toBe(await prettier.format(content, { ...config, parser: 'typescript' }))
  })

  it('formats the monitoring import when database and cache checks are both enabled', async () => {
    const content = generateBondsIndexContent(
      [],
      ['service-device'],
      [],
      ['@molecule/api-monitoring', '@molecule/api-database-sqlite', '@molecule/api-cache-memory'],
      loadRegistry(),
    )
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'api', 'prettierrc.json.tpl'), 'utf8'),
    )
    expect(content).toContain('monitor.register(createDatabaseCheck())')
    expect(content).toContain('monitor.register(createCacheCheck())')
    expect(content).not.toContain('resolveAll')
    expect(content).toBe(await prettier.format(content, { ...config, parser: 'typescript' }))
  })
})
