/**
 * A freshly scaffolded project gives `prettier --write` nothing to do — including a
 * `--skip-install` scaffold, which skips mlcl's own formatting pass to stay fast.
 *
 * Every later formatter run over the project (an editor's format-on-save, a pre-commit hook,
 * `npm run format:check`, a hosting platform's deploy) otherwise rewrites the files the
 * templates and generators shipped unformatted. Measured on a full-stack React scaffold
 * (2026-11-04): 49 files — 22 locale files, pages, the API router and server, tests and
 * `vite.config.ts` — which a platform deploy then re-formatted and wrote back on every
 * project's first deploy.
 *
 * The fix lives at the source (the templates and the code that assembles generated files), so
 * the check drives the REAL `mlcl create --skip-install` and asks the same formatter pass
 * `mlcl create` runs without the flag which files it would change. A failure names them.
 *
 * @module
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { unformattedGeneratedFiles } from '../../lib/format.js'
import { ensureRootFormatterConfig } from '../../lib/scaffold.js'
import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

let dir: string
let prevCwd: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-scaffold-format-clean-'))
  prevCwd = process.cwd()
  process.chdir(dir)
})

afterEach(async () => {
  process.chdir(prevCwd)
  await rm(dir, { recursive: true, force: true })
})

/** Run the real command with its progress output swallowed. */
async function runCreate(argv: string[]): Promise<void> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Create(argv, config)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  await cmd.run()
}

const CASES: { name: string; argv: string[] }[] = [
  { name: 'full-stack react', argv: ['--type', 'full-stack', '--framework', 'react'] },
  { name: 'full-stack vue', argv: ['--type', 'full-stack', '--framework', 'vue'] },
  { name: 'full-stack svelte', argv: ['--type', 'full-stack', '--framework', 'svelte'] },
  { name: 'full-stack solid', argv: ['--type', 'full-stack', '--framework', 'solid'] },
  { name: 'full-stack angular', argv: ['--type', 'full-stack', '--framework', 'angular'] },
  {
    name: 'full-stack react-native-web',
    argv: ['--type', 'full-stack', '--framework', 'react-native-web'],
  },
  { name: 'app react', argv: ['--type', 'app', '--framework', 'react'] },
  { name: 'api', argv: ['--type', 'api'] },
  { name: 'static react', argv: ['--type', 'static', '--framework', 'react'] },
]

describe('a multi-package root formats like its packages', () => {
  it('gives a full-stack root the packages’ .prettierrc and .prettierignore', async () => {
    await runCreate([
      'proj',
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--no-interactive',
      '--skip-install',
    ])
    const root = join(dir, 'proj')
    for (const name of ['.prettierrc', '.prettierignore'])
      expect(await readFile(join(root, name), 'utf8')).toBe(
        await readFile(join(root, 'app', name), 'utf8'),
      )
  }, 240_000)

  it('keeps a root config that already exists', async () => {
    const root = join(dir, 'proj')
    await mkdir(root, { recursive: true })
    await writeFile(join(root, '.prettierrc'), '{ "semi": true }\n')
    await ensureRootFormatterConfig(root)
    expect(await readFile(join(root, '.prettierrc'), 'utf8')).toBe('{ "semi": true }\n')
    expect(await readFile(join(root, '.prettierignore'), 'utf8')).toContain('node_modules/')
  })
})

describe('mlcl create --skip-install leaves nothing for prettier --write', () => {
  it.each(CASES)(
    '$name',
    async ({ argv }) => {
      await runCreate(['proj', ...argv, '--no-interactive', '--skip-install'])
      expect(await unformattedGeneratedFiles(join(dir, 'proj'))).toEqual([])
    },
    240_000,
  )
})
