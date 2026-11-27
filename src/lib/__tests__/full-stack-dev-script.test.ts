/**
 * A full-stack project's root `npm run dev` runs both dev servers under `concurrently -k`. The older
 * `npm run dev:api & npm run dev:app` never started the app on Windows (npm runs scripts with cmd.exe there, and
 * `a & b` starts b only after a exits), and an API that crashed left the app running. Both create paths write the
 * new script: the custom path in `createFullStackProject`, and the `--template` path by replacing the background-job
 * script the flagship sources carry (molecule.dev sandboxes copy those sources raw and start each half on its own).
 */
import { existsSync } from 'node:fs'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  CONCURRENTLY_VERSION,
  copyTemplateInstance,
  createFullStackProject,
  FULL_STACK_DEV_SCRIPT,
  readTemplateSetupSqlVersions,
  useFullStackDevScript,
} from '../scaffold.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES_APPS = join(ROOT, 'templates', 'apps')

interface RootPackage {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
}

let workdir: string

beforeEach(async () => {
  workdir = await mkdtemp(join(tmpdir(), 'mlcl-dev-script-'))
})

afterEach(async () => {
  await rm(workdir, { recursive: true, force: true })
})

const readRoot = async (root: string): Promise<RootPackage> =>
  JSON.parse(await readFile(join(root, 'package.json'), 'utf-8')) as RootPackage

/** The checks every full-stack root must pass, whichever path wrote it. */
function expectConcurrentDev(pkg: RootPackage, label: string): void {
  expect(pkg.scripts?.dev, label).toBe(FULL_STACK_DEV_SCRIPT)
  expect(pkg.scripts?.['dev:api'], label).toBe('npm run dev --workspace=api')
  expect(pkg.scripts?.['dev:app'], label).toBe('npm run dev --workspace=app')
  expect(pkg.devDependencies?.concurrently, label).toBe(CONCURRENTLY_VERSION)
  expect(CONCURRENTLY_VERSION, 'pinned exact').toMatch(/^\d+\.\d+\.\d+$/)
}

describe('full-stack root dev script', () => {
  it('the custom path writes the concurrent dev script and pins concurrently', async () => {
    await createFullStackProject(workdir, 'custom-app', 'react')
    expectConcurrentDev(await readRoot(workdir), 'createFullStackProject')
  })

  it('the --template path replaces the background-job script a flagship source carries', async () => {
    const entries = await readdir(TEMPLATES_APPS, { withFileTypes: true })
    const slug = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('_'))
      .map((e) => e.name)
      .find((name) => existsSync(join(TEMPLATES_APPS, name, 'app', 'package.json')))
    expect(slug, 'at least one flagship template').toBeTruthy()
    const templateDir = join(TEMPLATES_APPS, slug!)
    expect((await readRoot(templateDir)).scripts?.dev).toBe('npm run dev:api & npm run dev:app')

    const dest = join(workdir, 'tpl-project')
    await copyTemplateInstance(
      templateDir,
      dest,
      'tpl-project',
      await readTemplateSetupSqlVersions(templateDir),
    )
    expectConcurrentDev(await readRoot(dest), `copyTemplateInstance(${slug!})`)
  })

  it('every flagship root either gets the concurrent script or keeps a dev script of its own', async () => {
    const entries = await readdir(TEMPLATES_APPS, { withFileTypes: true })
    const shapes = new Set<string>()
    for (const entry of entries) {
      if (!entry.isDirectory() || !existsSync(join(TEMPLATES_APPS, entry.name, 'package.json')))
        continue
      const dev = (await readRoot(join(TEMPLATES_APPS, entry.name))).scripts?.dev ?? '(none)'
      shapes.add(dev)
    }
    // A third shape would be a script this switch knows nothing about: decide for it here.
    expect([...shapes].sort()).toEqual(
      ['npm run dev --workspace=app', 'npm run dev:api & npm run dev:app'].sort(),
    )
  })

  it('keeps a dev script the project wrote itself', async () => {
    const own = {
      scripts: { dev: 'turbo dev', 'dev:api': 'x', 'dev:app': 'y' },
      devDependencies: { turbo: '2.5.0' },
    }
    await writeFile(join(workdir, 'package.json'), JSON.stringify(own, null, 2) + '\n')
    await useFullStackDevScript(workdir)
    expect(await readRoot(workdir)).toEqual(own)
  })

  it('does nothing without a root package.json', async () => {
    await useFullStackDevScript(workdir)
    expect(existsSync(join(workdir, 'package.json'))).toBe(false)
  })
})
