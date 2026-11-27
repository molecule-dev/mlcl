/**
 * The custom `mlcl create` API skeleton wrote `dev: "tsx watch --include
 * 'migrations/*.sql' src/server.ts"` — no `--env-file=.env` — while every one of
 * the 150 flagship templates carries it (plus `--env-file-if-exists=.env` on
 * `start` and `--env-file=.env` on `db:setup`). The gap is not cosmetic: in a
 * scaffolded project an `.env` variable the executor appends is DEAD in the dev
 * server (the platform sources `/etc/mol/env` and `@molecule/api-secrets-env`
 * copies only the keys `bonds/index.ts` names), so a debug flag written to
 * `.env` never arrives and the run chases a phantom key mismatch — X1 flash-m64
 * burned 4 min 26 s on exactly that before finding its own router bug.
 *
 * Pins the scaffold's three lines against a template's, and the template fleet
 * against carrying the flag at all, so the two can never drift apart again.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import { createApiProject, generateEnvFile } from '../scaffold.js'

/** The mlcl workspace root (this file lives in `src/lib/__tests__/`). */
const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const TEMPLATES_DIR = join(MLCL_ROOT, 'templates', 'apps')

/** The scripts of one api workspace's package.json. */
function apiScripts(apiDir: string): Record<string, string> {
  const raw = readFileSync(join(apiDir, 'package.json'), 'utf-8')
  return (JSON.parse(raw) as { scripts?: Record<string, string> }).scripts ?? {}
}

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

describe('scaffolded API scripts load .env', () => {
  it('the api skeleton carries the templates` --env-file lines', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-api-devscript-'))
    await createApiProject(dir, 'demo-api')

    const scaffolded = apiScripts(dir)
    const template = apiScripts(join(TEMPLATES_DIR, '3d-model-viewer', 'api'))

    // A template-based project loads `.env`; a scaffolded one must too.
    expect(scaffolded.dev).toBe(template.dev)
    expect(scaffolded.start).toBe(template.start)
    expect(scaffolded['db:setup']).toBe(template['db:setup'])
    expect(scaffolded.dev).toContain('--env-file-if-exists=.env')
    // The native watch suite exercises these two commands. Every template must ship
    // that same command, including its crash recovery and non-source exclusions.
    for (const name of readdirSync(TEMPLATES_DIR)) {
      const apiDir = join(TEMPLATES_DIR, name, 'api')
      if (existsSync(join(apiDir, 'package.json'))) {
        expect(apiScripts(apiDir).dev, name).toBe(scaffolded.dev)
      }
    }
  })

  it('every flagship template loads .env on dev, start and db:setup', () => {
    const missing: string[] = []
    for (const name of readdirSync(TEMPLATES_DIR)) {
      const apiDir = join(TEMPLATES_DIR, name, 'api')
      if (!existsSync(join(apiDir, 'package.json'))) continue
      const scripts = apiScripts(apiDir)
      if (!(scripts.dev ?? '').includes('--env-file-if-exists=.env')) missing.push(`${name} dev`)
      if (!(scripts.start ?? '').includes('--env-file-if-exists=.env'))
        missing.push(`${name} start`)
      if (!(scripts['db:setup'] ?? '').includes('--env-file-if-exists=.env'))
        missing.push(`${name} db:setup`)
    }
    expect(missing).toEqual([])
  })

  it('each script starts in a fresh clone, which has no .env (git ignores it)', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-api-devscript-'))
    await createApiProject(dir, 'demo-api')
    const scripts = apiScripts(dir)
    const empty = await mkdtemp(join(tmpdir(), 'mlcl-api-clone-'))
    try {
      for (const name of ['dev', 'start', 'db:setup']) {
        const flag = scripts[name]?.split(/\s+/).find((word) => word.startsWith('--env-file'))
        expect(flag, `${name} loads .env`).toBeTruthy()
        // Node itself reads the flag, before any app code: run it with nothing else.
        const run = spawnSync(process.execPath, [flag!, '-e', ''], { cwd: empty, encoding: 'utf8' })
        // The plain `--env-file=.env` exits 9 with "node: .env: not found".
        expect(run.stderr, name).not.toContain('node: .env: not found')
        expect(run.status, name).toBe(0)
      }
    } finally {
      await rm(empty, { recursive: true, force: true })
    }
  })

  it('the .env the scripts load is written even for a secret-less project', async () => {
    // Every scaffold path writes one, so a dev server started right after create
    // reads its keys (a fresh clone, which has none, still starts): `mlcl create --template` at
    // create.ts:346 and the custom path at create.ts:1034/1047, both through
    // `generateEnvFile`. A project selecting no secret-bearing package must
    // still get its `.env`.
    dir = await mkdtemp(join(tmpdir(), 'mlcl-api-devscript-'))
    await generateEnvFile(dir, [], 'api', 'demo-api')
    const env = await readFile(join(dir, '.env'), 'utf-8')
    expect(env).toContain('PORT=4000')
  })
})
