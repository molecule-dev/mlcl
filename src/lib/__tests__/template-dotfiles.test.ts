/**
 * npm never packs `.gitignore` or `.npmrc` files, so a flagship installed from
 * the registry lost them and `mlcl create --template` scaffolded a project with
 * no `.gitignore` (the file that keeps `.env*` secrets out of git). Proven here
 * through npm's real packing: a synthetic package is packed by `npm pack`,
 * extracted, and the real `copyTemplateInstance` copies its template.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { copyTemplateInstance, shouldSkipDuringCopy } from '../scaffold.js'
import {
  cleanTemplateDotfiles,
  packTemplateDotfiles,
  restoreTemplateDotfiles,
  TEMPLATE_DOTFILES_MANIFEST,
  templateDotfiles,
} from '../template-dotfiles.js'

let root: string | null = null

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
  root = null
})

const ROOT_IGNORE = 'node_modules/\n.env*\n!.env.example\n'
const APP_IGNORE = 'node_modules/\n/dist/\n'
const API_IGNORE = 'node_modules/\n/dist/\n.keys/\n'
const NPMRC = 'save-exact=true\n'

/** `<tmp>/pkg/templates/apps/fixture-app` with the dot files a flagship carries. */
async function makePackage(): Promise<{ pkg: string; templateDir: string }> {
  root = await mkdtemp(join(tmpdir(), 'mlcl-template-dotfiles-'))
  const pkg = join(root, 'pkg')
  const templateDir = join(pkg, 'templates', 'apps', 'fixture-app')
  await mkdir(join(templateDir, 'app', 'src'), { recursive: true })
  await mkdir(join(templateDir, 'api', 'src'), { recursive: true })
  await mkdir(join(templateDir, 'app', 'node_modules', 'dep'), { recursive: true })
  await mkdir(join(templateDir, 'app', 'dist'), { recursive: true })
  await writeFile(
    join(pkg, 'package.json'),
    JSON.stringify({ name: 'fixture-pkg', version: '1.0.0', files: ['/templates'] }),
  )
  await writeFile(
    join(templateDir, 'package.json'),
    JSON.stringify({ name: 'fixture-app', private: true, workspaces: ['api', 'app'] }),
  )
  await writeFile(join(templateDir, 'app', 'package.json'), JSON.stringify({ name: 'fixture-app' }))
  await writeFile(join(templateDir, 'api', 'package.json'), JSON.stringify({ name: 'fixture-api' }))
  await writeFile(join(templateDir, 'app', 'index.html'), '<title>Fixture</title>\n')
  await writeFile(join(templateDir, 'app', 'src', 'main.ts'), 'export {}\n')
  await writeFile(join(templateDir, 'api', 'src', 'index.ts'), 'export {}\n')
  await writeFile(join(templateDir, '.gitignore'), ROOT_IGNORE)
  await writeFile(join(templateDir, 'app', '.gitignore'), APP_IGNORE)
  await writeFile(join(templateDir, 'app', '.npmrc'), NPMRC)
  await writeFile(join(templateDir, 'api', '.gitignore'), API_IGNORE)
  await writeFile(join(templateDir, 'api', '.npmrc'), NPMRC)
  // Neither reaches a project, so neither is recorded.
  await writeFile(join(templateDir, 'app', 'node_modules', 'dep', '.gitignore'), 'x\n')
  await writeFile(join(templateDir, 'app', 'dist', '.gitignore'), 'x\n')
  return { pkg, templateDir }
}

/** `npm pack` the package for real, extract it, and return the packed template directory. */
function packAndExtract(pkg: string): string {
  const out = join(root as string, 'out')
  execFileSync('mkdir', ['-p', out])
  const tgz = execFileSync(
    'npm',
    ['pack', '--ignore-scripts', '--pack-destination', out, '--silent'],
    {
      cwd: pkg,
      encoding: 'utf8',
    },
  )
    .trim()
    .split('\n')
    .at(-1) as string
  execFileSync('tar', ['-xzf', join(out, tgz), '-C', out])
  return join(out, 'package', 'templates', 'apps', 'fixture-app')
}

describe('template dot files through npm packing', () => {
  it('records exactly the dot files a scaffolded project receives', async () => {
    const { templateDir } = await makePackage()
    expect(templateDotfiles(templateDir, shouldSkipDuringCopy)).toEqual([
      '.gitignore',
      'api/.gitignore',
      'api/.npmrc',
      'app/.gitignore',
      'app/.npmrc',
    ])
  })

  it('npm drops them, and without a manifest the copied project has no .gitignore (the defect)', async () => {
    const { pkg } = await makePackage()
    const packed = packAndExtract(pkg)
    expect(readdirSync(packed)).not.toContain('.gitignore')
    expect(existsSync(join(packed, 'app', '.npmrc'))).toBe(false)

    const dest = join(root as string, 'project')
    await copyTemplateInstance(packed, dest, 'my-app', {})
    expect(existsSync(join(dest, '.gitignore'))).toBe(false)
  })

  it('a packed manifest restores every dot file byte for byte, and is not copied itself', async () => {
    const { pkg } = await makePackage()
    expect(packTemplateDotfiles(join(pkg, 'templates'), shouldSkipDuringCopy)).toEqual({
      templates: 1,
      files: 5,
    })
    const packed = packAndExtract(pkg)
    expect(readdirSync(packed)).toContain(TEMPLATE_DOTFILES_MANIFEST)
    expect(readdirSync(packed)).not.toContain('.gitignore')

    const dest = join(root as string, 'project')
    await copyTemplateInstance(packed, dest, 'my-app', {})
    expect(readFileSync(join(dest, '.gitignore'), 'utf8')).toBe(ROOT_IGNORE)
    expect(readFileSync(join(dest, 'app', '.gitignore'), 'utf8')).toBe(APP_IGNORE)
    expect(readFileSync(join(dest, 'api', '.gitignore'), 'utf8')).toBe(API_IGNORE)
    expect(readFileSync(join(dest, 'app', '.npmrc'), 'utf8')).toBe(NPMRC)
    expect(readFileSync(join(dest, 'api', '.npmrc'), 'utf8')).toBe(NPMRC)
    expect(existsSync(join(dest, TEMPLATE_DOTFILES_MANIFEST))).toBe(false)

    expect(cleanTemplateDotfiles(join(pkg, 'templates'))).toBe(1)
    expect(
      existsSync(join(pkg, 'templates', 'apps', 'fixture-app', TEMPLATE_DOTFILES_MANIFEST)),
    ).toBe(false)
  })

  it('the monorepo copy (real dot files, no manifest) is unchanged, and a copied file is never overwritten', async () => {
    const { templateDir } = await makePackage()
    const dest = join(root as string, 'project')
    await copyTemplateInstance(templateDir, dest, 'my-app', {})
    expect(readFileSync(join(dest, '.gitignore'), 'utf8')).toBe(ROOT_IGNORE)
    expect(readFileSync(join(dest, 'app', '.npmrc'), 'utf8')).toBe(NPMRC)

    await writeFile(
      join(templateDir, TEMPLATE_DOTFILES_MANIFEST),
      JSON.stringify({ schema: 1, files: { '.gitignore': 'stale\n' } }),
    )
    expect(await restoreTemplateDotfiles(templateDir, dest)).toEqual([])
    expect(readFileSync(join(dest, '.gitignore'), 'utf8')).toBe(ROOT_IGNORE)
  })

  it('refuses to pack a dot file no scaffold would restore', async () => {
    const { pkg, templateDir } = await makePackage()
    await mkdir(join(templateDir, 'e2e'), { recursive: true })
    await writeFile(join(templateDir, 'e2e', '.gitignore'), 'results/\n')
    expect(() => packTemplateDotfiles(join(pkg, 'templates'), shouldSkipDuringCopy)).toThrow(
      /apps\/fixture-app\/e2e\/\.gitignore/,
    )
  })

  it('refuses a manifest entry outside the copied positions', async () => {
    const { templateDir } = await makePackage()
    const dest = join(root as string, 'project')
    await mkdir(dest, { recursive: true })
    for (const rel of ['../escape/.gitignore', 'e2e/.gitignore', 'app/notes.txt', 'app//.npmrc']) {
      await writeFile(
        join(templateDir, TEMPLATE_DOTFILES_MANIFEST),
        JSON.stringify({ schema: 1, files: { [rel]: 'x\n' } }),
      )
      await expect(restoreTemplateDotfiles(templateDir, dest)).rejects.toThrow(
        /not a template dot file/,
      )
    }
    expect(existsSync(join(root as string, 'escape'))).toBe(false)
  })
})
