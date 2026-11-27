/**
 * `mlcl add <package> --inject` writes the app files of the optional feature the package brings.
 *
 * A starter app has a settings page, a footer, password-reset pages and the rest only when its
 * stack brings them (`optional-features.ts`). Adding the package later wired its bonds and wrote
 * no page: the app kept a log-out button where the settings drawer goes and no route to
 * `/settings`, and an email transport added to the api left the app with no reset pages. The real
 * `mlcl create` writes each project; the real add command adds the package against the
 * workspace's packages.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Config } from '@oclif/core'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { featureSmokeModules } from '../../lib/__tests__/feature-smoke-modules.js'
import { providerTemplateVars } from '../../lib/feature-files.js'
import { loadRegistry } from '../../lib/registry.js'
import Add from '../add.js'

vi.mock('execa', () => ({ execa: vi.fn() }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const WORKSPACE_MODULES = dirname(
  dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))),
)

/** Create a project with the real CLI, its packages resolved from the workspace. */
function create(dir: string, args: string[]): void {
  execFileSync(
    process.execPath,
    [
      join(MLCL_ROOT, 'bin', 'run.js'),
      'create',
      dir,
      ...args,
      '--no-interactive',
      '--skip-install',
    ],
    { cwd: MLCL_ROOT, encoding: 'utf8', timeout: 240_000, stdio: 'pipe' },
  )
}

/** Run the add command from a directory, as a user does. */
async function add(cwd: string, names: string[], { inject = true } = {}): Promise<string> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Add([...names, ...(inject ? ['--inject'] : []), '--no-install'], config)
  const logged: string[] = []
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  vi.spyOn(cmd, 'log').mockImplementation((line?: string) => void logged.push(line ?? ''))
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    await cmd.run()
  } finally {
    process.chdir(previous)
  }
  return logged.join('\n')
}

/** The features an app's package.json records. */
async function recorded(app: string): Promise<string[]> {
  const pkg = JSON.parse(await readFile(join(app, 'package.json'), 'utf8')) as {
    molecule?: { templateFeatures?: string[] }
  }
  return pkg.molecule?.templateFeatures ?? []
}

let scratch: string
let fixtureModules: string
beforeAll(async () => {
  scratch = await mkdtemp(join(tmpdir(), 'mlcl-add-feature-files-'))
  const fixture = await featureSmokeModules(scratch, WORKSPACE_MODULES)
  fixtureModules = fixture.modules
  vi.stubEnv('MLCL_REGISTRY_PATH', fixture.registry)
}, 150_000)
afterAll(async () => {
  vi.unstubAllEnvs()
  await rm(scratch, { recursive: true, force: true })
})

describe('adding the settings panel to an app created without it (OLD MUSTFAIL)', () => {
  let app: string
  let before: { app: string; userMenu: string; features: string[] }
  let output: string
  beforeAll(async () => {
    app = join(scratch, 'settings-app')
    create(app, ['--type', 'app', '--framework', 'react', '--packages', '@molecule/app-routing'])
    await symlink(fixtureModules, join(app, 'node_modules'))
    // The project's own edit, away from the lines the feature changes.
    const appFile = join(app, 'src', 'App.tsx')
    await writeFile(appFile, `// Our routes.\n${await readFile(appFile, 'utf8')}`)
    before = {
      app: await readFile(appFile, 'utf8'),
      userMenu: await readFile(join(app, 'src', 'components', 'UserMenu.tsx'), 'utf8'),
      features: await recorded(app),
    }
    output = await add(app, ['@molecule/app-settings-panel-react'])
  }, 300_000)

  it('starts with no settings page', async () => {
    expect(before.app).not.toContain('/settings')
    expect(before.userMenu).toContain('userMenu.logOut')
    expect(before.features).not.toContain('settings')
  })

  it('writes the settings page and panel', () => {
    expect(existsSync(join(app, 'src', 'pages', 'Settings.tsx'))).toBe(true)
    expect(existsSync(join(app, 'src', 'components', 'SettingsPanel.tsx'))).toBe(true)
    expect(output).toContain('+ src/pages/Settings.tsx')
  })

  it("routes to it and opens the drawer from the header, keeping the project's edit", async () => {
    const appFile = await readFile(join(app, 'src', 'App.tsx'), 'utf8')
    expect(appFile.startsWith('// Our routes.\n')).toBe(true)
    expect(appFile).toContain("import { Settings } from './pages/Settings.js'")
    expect(appFile).toContain("{ path: '/settings', access: 'private', element: <Settings /> }")
    const userMenu = await readFile(join(app, 'src', 'components', 'UserMenu.tsx'), 'utf8')
    expect(userMenu).toContain("import('./SettingsPanel.js')")
    expect(userMenu).not.toContain('userMenu.logOut')
  })

  it('records the feature, and a second add changes nothing', async () => {
    expect(await recorded(app)).toContain('settings')
    const appFile = await readFile(join(app, 'src', 'App.tsx'), 'utf8')
    expect(await add(app, ['@molecule/app-settings-panel-react'])).not.toContain('The app files')
    expect(await readFile(join(app, 'src', 'App.tsx'), 'utf8')).toBe(appFile)
  }, 300_000)
})

describe("adding an email transport to a full-stack project's api", () => {
  let project: string
  let output: string
  beforeAll(async () => {
    project = join(scratch, 'emails')
    create(project, [
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-resource-user,@molecule/app-routing',
    ])
    for (const half of ['api', 'app'])
      await symlink(fixtureModules, join(project, half, 'node_modules'))
    output = await add(join(project, 'api'), ['@molecule/api-emails-resend'])
  }, 300_000)

  it("writes the app's reset pages and links to them from the login page", async () => {
    const app = join(project, 'app', 'src')
    expect(existsSync(join(app, 'pages', 'ForgotPassword.tsx'))).toBe(true)
    expect(existsSync(join(app, 'pages', 'ResetPassword.tsx'))).toBe(true)
    expect(await readFile(join(app, 'App.tsx'), 'utf8')).toContain("path: '/forgot-password'")
    expect(await readFile(join(app, 'pages', 'Login.tsx'), 'utf8')).toMatch(/forgot-password/)
    expect(await recorded(join(project, 'app'))).toContain('emails')
    expect(output).toContain('The app files of emails')
  })

  // Counterexample: a package that brings no feature writes no app file.
  it('leaves the app alone for a package that brings no feature', async () => {
    const appFile = await readFile(join(project, 'app', 'src', 'App.tsx'), 'utf8')
    const log = await add(join(project, 'api'), ['@molecule/api-cache-memory'])
    expect(log).not.toContain('The app files')
    expect(await readFile(join(project, 'app', 'src', 'App.tsx'), 'utf8')).toBe(appFile)
  }, 300_000)
})

describe('an app whose own edit overlaps the lines a feature changes', () => {
  let app: string
  let userMenu: string
  let output: string
  beforeAll(async () => {
    app = join(scratch, 'edited-menu')
    create(app, ['--type', 'app', '--framework', 'react', '--packages', '@molecule/app-routing'])
    await symlink(fixtureModules, join(app, 'node_modules'))
    const file = join(app, 'src', 'components', 'UserMenu.tsx')
    userMenu = (await readFile(file, 'utf8')).replace('variant="ghost"', 'variant="outline"')
    await writeFile(file, userMenu)
    output = await add(app, ['@molecule/app-settings-panel-react'])
  }, 300_000)

  it('leaves that file as it is and prints the change to make', async () => {
    expect(await readFile(join(app, 'src', 'components', 'UserMenu.tsx'), 'utf8')).toBe(userMenu)
    expect(output).toContain('! src/components/UserMenu.tsx has edits where these lines go')
    expect(output).toContain("+  import('./SettingsPanel.js')")
  })

  it('still writes the rest', () => {
    expect(existsSync(join(app, 'src', 'pages', 'Settings.tsx'))).toBe(true)
    expect(output).toContain('~ src/App.tsx')
  })
})

describe('OAuth providers', () => {
  let project: string
  beforeAll(async () => {
    project = join(scratch, 'oauth')
    create(project, [
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-resource-user,@molecule/app-routing,@molecule/api-oauth-google',
    ])
    for (const half of ['api', 'app'])
      await symlink(fixtureModules, join(project, half, 'node_modules'))
  }, 300_000)

  it('are listed in registry order, as inject rewrites the list', () => {
    const vars = providerTemplateVars(
      ['@molecule/api-oauth-google', '@molecule/api-oauth-github'],
      loadRegistry(),
    )
    expect(vars.OAUTH_PROVIDERS).toBe("'github', 'google'")
  })

  it('a second one joins the list with no conflict', async () => {
    const configFile = join(project, 'app', 'src', 'config.ts')
    expect(await readFile(configFile, 'utf8')).toContain("oauthProviders: ['google']")
    const log = await add(join(project, 'api'), ['@molecule/api-oauth-github'])
    expect(await readFile(configFile, 'utf8')).toContain("oauthProviders: ['github', 'google']")
    expect(log).not.toContain('has edits where these lines go')
  }, 300_000)
})

describe('a package declared earlier without --inject', () => {
  let project: string
  beforeAll(async () => {
    project = join(scratch, 'declared-earlier')
    create(project, [
      '--type',
      'full-stack',
      '--framework',
      'react',
      '--packages',
      '@molecule/api-database-sqlite,@molecule/api-resource-user,@molecule/app-routing',
    ])
    for (const half of ['api', 'app'])
      await symlink(fixtureModules, join(project, half, 'node_modules'))
    await add(join(project, 'api'), ['@molecule/api-emails-resend'], { inject: false })
  }, 300_000)

  // Its routes are not mounted until it is injected, so no page may call them yet.
  it('brings no page when another package is added', async () => {
    await add(join(project, 'api'), ['@molecule/api-cache-memory'])
    expect(existsSync(join(project, 'app', 'src', 'pages', 'ForgotPassword.tsx'))).toBe(false)
  }, 300_000)

  it('brings its pages when it is added with --inject', async () => {
    await add(join(project, 'api'), ['@molecule/api-emails-resend'])
    expect(existsSync(join(project, 'app', 'src', 'pages', 'ForgotPassword.tsx'))).toBe(true)
  }, 300_000)
})
