/**
 * A copied flagship declares every package its ESLint config imports.
 *
 * The copy overwrites each workspace's `eslint.config.js` with the shared config, while the
 * manifest is the template's own. Inside this workspace the config's imports resolve through
 * hoisting, so a template that never declared one still lints; a user's standalone copy then
 * failed `npm run build` (its prebuild lint) with ERR_MODULE_NOT_FOUND for
 * `eslint-plugin-react-hooks` (2026-11-22: 150 of 152 flagship apps). The config now imports only
 * `@molecule/eslint-config`, which brings the plugins, so that one package and `eslint` are what
 * every copy must declare.
 *
 * @module
 */

import { cpSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getMoleculeVersion } from '../registry.js'
import { copyTemplateInstance, readTemplateSetupSqlVersions } from '../scaffold.js'

const TEMPLATES_APPS = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')
const CONFIG_PACKAGE = '@molecule/eslint-config'

/** The bare package names a config imports (relative and `node:` imports excluded). */
const importedPackages = (config: string): string[] =>
  [...config.matchAll(/^import\b[^'"]*['"]([^'"]+)['"]/gm)]
    .map(([, specifier]) => specifier!)
    .filter((specifier) => !specifier.startsWith('.') && !specifier.startsWith('node:'))
    .map((specifier) =>
      specifier.startsWith('@')
        ? specifier.split('/').slice(0, 2).join('/')
        : specifier.split('/')[0]!,
    )

/** Each workspace of a copy that has a config: what it imports and what its manifest declares. */
async function lintDeclarations(
  dest: string,
): Promise<{ ws: string; imported: string[]; declared: Record<string, string> }[]> {
  const out = []
  for (const ws of ['app', 'api']) {
    const configPath = join(dest, ws, 'eslint.config.js')
    if (!existsSync(configPath)) continue
    const pkg = JSON.parse(await readFile(join(dest, ws, 'package.json'), 'utf8'))
    out.push({
      ws,
      imported: importedPackages(await readFile(configPath, 'utf8')),
      declared: { ...pkg.dependencies, ...pkg.devDependencies },
    })
  }
  return out
}

describe('a copied flagship declares what its ESLint configs import', () => {
  let workdir: string
  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'mlcl-eslint-deps-'))
  })
  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  it('blog: app and api manifests declare the config package and eslint, and keep their own pins', async () => {
    const templateDir = join(TEMPLATES_APPS, 'blog')
    const before = JSON.parse(await readFile(join(templateDir, 'app', 'package.json'), 'utf8'))
    const dest = join(workdir, 'blog-copy')
    await copyTemplateInstance(
      templateDir,
      dest,
      'blog-copy',
      await readTemplateSetupSqlVersions(templateDir),
    )
    const workspaces = await lintDeclarations(dest)
    expect(workspaces.map(({ ws }) => ws)).toEqual(['app', 'api'])
    for (const { ws, imported, declared } of workspaces) {
      expect(imported, `${ws} imports`).toEqual([CONFIG_PACKAGE])
      expect(declared.eslint, `${ws} declares eslint`).toBeDefined()
      if (ws === 'app') {
        expect(declared[CONFIG_PACKAGE]).toBe(before.devDependencies[CONFIG_PACKAGE])
        expect(declared.eslint).toBe(before.devDependencies.eslint)
      }
    }
  })

  it('a template manifest that lacks the config package gets it at the registry pin', async () => {
    // The case that failed: the template itself does not declare what its config imports.
    // Laid out as templates/apps/<slug>: the copy reads shared assets (fonts) from ../../shared.
    const templateDir = join(workdir, 'templates', 'apps', 'blog')
    mkdirSync(join(workdir, 'templates', 'apps'), { recursive: true })
    symlinkSync(join(TEMPLATES_APPS, '..', 'shared'), join(workdir, 'templates', 'shared'), 'dir')
    cpSync(join(TEMPLATES_APPS, 'blog'), templateDir, {
      recursive: true,
      filter: (src) => !src.split('/').includes('node_modules'),
    })
    for (const ws of ['app', 'api']) {
      const manifest = join(templateDir, ws, 'package.json')
      const pkg = JSON.parse(readFileSync(manifest, 'utf8'))
      delete pkg.devDependencies?.[CONFIG_PACKAGE]
      writeFileSync(manifest, JSON.stringify(pkg, null, 2) + '\n')
    }
    const dest = join(workdir, 'blog-copy')
    await copyTemplateInstance(
      templateDir,
      dest,
      'blog-copy',
      await readTemplateSetupSqlVersions(templateDir),
    )
    const workspaces = await lintDeclarations(dest)
    expect(workspaces).toHaveLength(2)
    for (const { ws, declared } of workspaces)
      expect(declared[CONFIG_PACKAGE], ws).toBe(getMoleculeVersion(CONFIG_PACKAGE))
  })
})
