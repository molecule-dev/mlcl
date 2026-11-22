/**
 * A copied flagship declares every package its ESLint config imports.
 *
 * The copy overwrites each workspace's `eslint.config.js` with the shared config, while the
 * manifest is the template's own. Inside this workspace the config's plugins resolve through
 * hoisting, so a template that never declared one still lints; a user's standalone copy then
 * failed `npm run build` (its prebuild lint) with ERR_MODULE_NOT_FOUND for
 * `eslint-plugin-react-hooks` (2026-11-22: 150 of 152 flagship apps).
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { copyTemplateInstance, readTemplateSetupSqlVersions } from '../scaffold.js'

const TEMPLATES_APPS = join(import.meta.dirname, '..', '..', '..', 'templates', 'apps')

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

describe('a copied flagship declares what its ESLint configs import', () => {
  let workdir: string
  beforeEach(async () => {
    workdir = await mkdtemp(join(tmpdir(), 'mlcl-eslint-deps-'))
  })
  afterEach(async () => {
    await rm(workdir, { recursive: true, force: true })
  })

  it('blog: app and api manifests list every imported lint package, and keep their own pins', async () => {
    const templateDir = join(TEMPLATES_APPS, 'blog')
    const before = JSON.parse(await readFile(join(templateDir, 'app', 'package.json'), 'utf8'))
    // The case that failed: the template itself does not declare the plugin.
    expect(before.devDependencies['eslint-plugin-react-hooks']).toBeUndefined()

    const dest = join(workdir, 'blog-copy')
    await copyTemplateInstance(
      templateDir,
      dest,
      'blog-copy',
      await readTemplateSetupSqlVersions(templateDir),
    )
    for (const ws of ['app', 'api']) {
      const configPath = join(dest, ws, 'eslint.config.js')
      if (!existsSync(configPath)) continue
      const pkg = JSON.parse(await readFile(join(dest, ws, 'package.json'), 'utf8'))
      const declared = { ...pkg.dependencies, ...pkg.devDependencies }
      const imported = importedPackages(await readFile(configPath, 'utf8'))
      expect(imported, `${ws} imports lint packages`).toContain('eslint-plugin-react-hooks')
      expect(
        imported.filter((name) => !declared[name]),
        `${ws}/package.json lacks`,
      ).toEqual([])
      if (ws === 'app') expect(pkg.devDependencies.eslint).toBe(before.devDependencies.eslint)
    }
  })
})
