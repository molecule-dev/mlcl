import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as prettier from 'prettier'
import { afterEach, describe, expect, it } from 'vitest'

import {
  type InjectionPlan,
  synthesizeAppProjectFiles,
  writeSynthesizedFiles,
} from '../injector.js'
import { loadRegistry } from '../registry.js'

const roots: string[] = []

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

describe('synthesized source uses the project formatter before publication', () => {
  it.each([
    { semi: false, singleQuote: true, tabWidth: 2 },
    { semi: true, singleQuote: false, tabWidth: 4 },
  ])('writes an extended provider index in the declared format %j', async (config) => {
    const root = await mkdtemp(join(tmpdir(), 'inventory-wiring-format-'))
    roots.push(root)
    const target = join(root, 'src/bonds/index.ts')
    await mkdir(join(root, 'src/bonds'), { recursive: true })
    await writeFile(join(root, '.prettierrc'), JSON.stringify(config))
    // A pre-existing app index takes the real AST-extension path that emitted
    // printer-default quotes, semicolons and indentation after create --skip-install.
    await writeFile(
      target,
      'import { startup } from "./startup.js";\nexport function setupProviders(): void { startup(); }\n',
    )
    const plan: InjectionPlan = {
      molecule: '@molecule/app-theme-css-variables',
      moleculePackage: {
        name: '@molecule/app-theme-css-variables',
        version: '1.0.0',
        type: 'provider',
        routes: [],
        tables: [],
        exports: [],
        path: root,
      },
      files: [],
      dependencies: [],
      migrations: [],
      conflicts: [],
      bondSetup: {
        providerPackage: '@molecule/app-theme-css-variables',
        interfacePackage: '@molecule/app-theme',
        interfaceType: 'theme',
        setupCode: '',
      },
    }
    const operation = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-theme', '@molecule/app-theme-css-variables'],
      root,
      loadRegistry(),
    ).find((file) => file.targetPath === target)!
    const result = await writeSynthesizedFiles([operation])
    expect(result.error).toBeNull()
    expect(result.written).toEqual([target])
    const written = await readFile(target, 'utf8')
    expect(written).toContain('setupProviders')
    expect(written).toContain('startup()')
    expect(await prettier.check(written, { ...config, filepath: target })).toBe(true)
  })

  it('preserves unsupported data formats byte for byte', async () => {
    const root = await mkdtemp(join(tmpdir(), 'inventory-migration-format-'))
    roots.push(root)
    const target = join(root, 'migrations/001.sql')
    const content = 'CREATE  TABLE stock(id INTEGER); -- intentionally exact\n'
    const result = await writeSynthesizedFiles([
      { action: 'create', targetPath: target, content, description: 'Exact migration data' },
    ])
    expect(result.error).toBeNull()
    expect(await readFile(target, 'utf8')).toBe(content)
  })
})
