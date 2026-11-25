/**
 * Every request a scaffolded app makes is answered by a route its API serves.
 *
 * The custom starter's settings panel asked for `/api/billing/status` on stacks that mounted no
 * billing routes, its Upgrade opened the page it sat in, and its auth config sent password
 * changes to `/users/password`, which no route serves (billing review, 2026-11-24). For each
 * framework this scaffolds a full-stack app with every optional feature and checks each request
 * the app makes, the feature and framework package components and hooks it renders included,
 * against the routes the generated API mounts (`helpers/request-routes.ts` says how each is read).
 *
 * The molecule checkout beside mlcl (CI clones it as data) supplies the package sources.
 *
 * @module
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { APP_TEMPLATES } from './helpers/app-templates.js'
import {
  appRequests,
  type PackageSources,
  servedRoutes,
  unansweredRequests,
} from './helpers/request-routes.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const MOLECULE = join(ROOT, '..', 'molecule')

/** A provider for every optional feature; a payments provider brings the billing routes. */
const EVERY_FEATURE = [
  '@molecule/api-database-sqlite',
  '@molecule/api-resource-user',
  '@molecule/api-emails-resend',
  '@molecule/api-payments-stripe',
  '@molecule/api-oauth-github',
  '@molecule/api-two-factor-otplib',
]

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web']

/** The package sources the checker follows imports into. */
function packageSources(): PackageSources {
  const registry = JSON.parse(readFileSync(join(ROOT, 'registry.json'), 'utf8')) as {
    packages: PackageSources['packages']
  }
  return { moleculeRoot: MOLECULE, packages: registry.packages }
}

/** Scaffolds a full-stack app of `framework` with every optional feature into `project`. */
function scaffold(project: string, framework: string): void {
  execFileSync(
    process.execPath,
    [
      join(ROOT, 'bin', 'run.js'),
      'create',
      project,
      '--type',
      'full-stack',
      '--framework',
      framework,
      '--packages',
      EVERY_FEATURE.join(','),
      '--no-interactive',
      '--skip-install',
    ],
    { cwd: ROOT, encoding: 'utf8', timeout: 240_000, stdio: 'pipe' },
  )
}

describe('the frameworks this test covers', () => {
  it('are every app template framework', () => {
    const templates = readdirSync(APP_TEMPLATES, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name !== 'shared')
      .map((entry) => entry.name)
    expect([...templates].sort()).toEqual([...FRAMEWORKS].sort())
  })

  it('read package sources from the molecule checkout beside mlcl', () => {
    expect(existsSync(join(MOLECULE, 'packages')), `no molecule checkout at ${MOLECULE}`).toBe(true)
  })
})

describe.each(FRAMEWORKS)('a %s full-stack scaffold with every feature', (framework) => {
  let scratch: string
  let project: string
  const sources = packageSources()
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), `mlcl-requests-${framework}-`))
    project = join(scratch, 'project')
    scaffold(project, framework)
  }, 300_000)
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  it('makes no request its API does not serve', () => {
    expect(unansweredRequests(project, sources)).toEqual([])
  })

  // The check reads the settings panel package's billing component and the API's billing mount:
  // without both it would pass by reading nothing.
  it('reads the requests of the packages it renders and the routes of the middleware it mounts', () => {
    const requests = appRequests(join(project, 'app'), sources).map(
      (request) => `${request.method} ${request.path}`,
    )
    expect(requests).toContain('get /api/billing/status')
    expect(requests).toContain('patch /api/users/:param/password')
    const routes = servedRoutes(join(project, 'api'), sources).map(
      (route) => `${route.method} ${route.path}`,
    )
    expect(routes).toContain('get /api/billing/status')
    expect(routes).toContain('patch /api/users/:id/password')
  })
})

// Known-bad projects the check must refuse: each is the react scaffold with one route gone.
describe('a scaffold whose API lost a route its app calls', () => {
  let scratch: string
  let project: string
  const sources = packageSources()
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'mlcl-requests-bad-'))
    project = join(scratch, 'project')
    scaffold(project, 'react')
  }, 300_000)
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  /** A copy of the scaffold with one file's text changed. */
  function variant(name: string, file: string, change: (text: string) => string): string {
    const copy = join(scratch, name)
    cpSync(project, copy, { recursive: true })
    const path = join(copy, file)
    const before = readFileSync(path, 'utf8')
    const after = change(before)
    expect(after, `${file} did not change`).not.toBe(before)
    writeFileSync(path, after)
    return copy
  }

  it('names the billing requests when the billing routes are not mounted', () => {
    const copy = variant('no-billing', 'api/src/server.ts', (text) =>
      text.replace(/^\s*app\.use\('\/api\/billing', [^)]*\)\n/m, ''),
    )
    expect(unansweredRequests(copy, sources).map((r) => `${r.method} ${r.path}`)).toEqual(
      expect.arrayContaining(['get /api/billing/status', 'post /api/billing/checkout']),
    )
  })

  it('names a configured endpoint no route serves', () => {
    const copy = variant('old-password-endpoint', 'app/src/config.ts', (text) =>
      text
        .replace(
          /^\s*changePasswordEndpoint: .*\n/m,
          "  changePasswordEndpoint: '/users/password',\n",
        )
        .replace(/^\s*changePasswordMethod: .*\n/m, ''),
    )
    // With no method of its own the auth client sends it with its default, POST.
    expect(unansweredRequests(copy, sources)).toEqual([
      { method: 'post', path: '/api/users/password', file: 'app/src/config.ts' },
    ])
  })
})
