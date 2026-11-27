/**
 * `mlcl add <provider> --inject` mounts the routes the provider's feature turns on.
 *
 * A custom stack without an email transport has no password-reset routes. Adding one later wired
 * its bond and mounted nothing: `-m` synthesizes the shared files from the named package alone,
 * so the user resource, whose reset routes are marked `emails`, was never asked for them. The
 * project's own `handlers/auth.ts` lacked their code too, since a scaffold writes a feature
 * router's code only with its feature. The real `mlcl create` writes the project; the real inject
 * command adds the transport against the workspace's packages.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Config } from '@oclif/core'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { featureSmokeModules } from '../../lib/__tests__/feature-smoke-modules.js'
import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const WORKSPACE_MODULES = dirname(
  dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))),
)

let scratch: string
let project: string
let before: { router: string; auth: string }

beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'mlcl-inject-feature-routes-'))
  const fixture = await featureSmokeModules(scratch, WORKSPACE_MODULES)
  vi.stubEnv('MLCL_REGISTRY_PATH', fixture.registry)
  project = join(scratch, 'api')
  execFileSync(
    process.execPath,
    [
      join(MLCL_ROOT, 'bin', 'run.js'),
      'create',
      project,
      '--type',
      'api',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-resource-user',
      '--no-interactive',
      '--skip-install',
    ],
    { cwd: MLCL_ROOT, encoding: 'utf8', timeout: 240_000, stdio: 'pipe' },
  )
  await symlink(fixture.modules, join(project, 'node_modules'))
  before = {
    router: await readFile(join(project, 'src', 'App', 'router.ts'), 'utf8'),
    auth: await readFile(join(project, 'src', 'handlers', 'auth.ts'), 'utf8'),
  }
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      '-m',
      '@molecule/api-emails-resend',
      '-p',
      project,
      '--no-install',
      '--no-test',
      '--no-ai',
      '--force',
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
}, 300_000)

afterAll(async () => {
  vi.unstubAllEnvs()
  await rm(scratch, { recursive: true, force: true })
})

describe('adding an email transport to a stack without one (OLD MUSTFAIL)', () => {
  it('starts with no reset routes', () => {
    expect(before.router).not.toContain('resourceUserEmailsRouter')
    expect(before.auth).not.toContain('emailsRouter')
  })

  it("adds the reset routes' code to the project's router file", async () => {
    const auth = await readFile(join(project, 'src', 'handlers', 'auth.ts'), 'utf8')
    expect(auth).toContain('export const emailsRouter = Router()')
    expect(auth).toContain("'/users/forgot-password'")
    // Only the feature the add brought.
    expect(auth).not.toContain('twoFactorRouter')
    expect(
      auth.startsWith(before.auth.slice(0, before.auth.indexOf('export default router'))),
    ).toBe(true)
  })

  it('mounts them, importing the module once', async () => {
    const router = await readFile(join(project, 'src', 'App', 'router.ts'), 'utf8')
    expect(router).toContain('router.use(resourceUserEmailsRouter)')
    expect(router.match(/from '\.\.\/handlers\/auth\.js'/g)).toHaveLength(1)
    // Every route the project had is still mounted.
    for (const line of before.router.split('\n').filter((l) => l.startsWith('router.')))
      expect(router).toContain(line)
  })
})
