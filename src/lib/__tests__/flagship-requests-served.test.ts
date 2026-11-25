/**
 * Every request a flagship template makes is answered by a route its API serves.
 *
 * Fifty-one flagships rendered a plan-updated page that confirms the purchase with
 * `POST /users/:id/verify-payment/:provider` while their routers never mounted that route, 49
 * bonded no HTTP client, so the relative paths package hooks send never reached `/api`, four
 * listed OAuth buttons for providers the API had no routes for, and two sent the password change
 * as POST to an API serving PATCH only (dead-request sweep, 2026-11-24). This reads each
 * template's API routes and the requests its app makes from its entry module, the feature and
 * framework package hooks it renders included (`helpers/request-routes.ts` says how), with no
 * scaffold or install: the templates ship as they are.
 *
 * The molecule checkout beside mlcl (CI clones it as data) supplies the package sources.
 *
 * @module
 */

import { cpSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { type PackageSources, requestReport, unansweredRequests } from './helpers/request-routes.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const MOLECULE = join(ROOT, '..', 'molecule')
const APPS = join(ROOT, 'templates', 'apps')

/** The flagships with both halves. */
const FLAGSHIPS = readdirSync(APPS).filter(
  (slug) =>
    existsSync(join(APPS, slug, 'api', 'src')) && existsSync(join(APPS, slug, 'app', 'src')),
)

/** The package sources the checker follows imports into. */
function packageSources(): PackageSources {
  const registry = JSON.parse(readFileSync(join(ROOT, 'registry.json'), 'utf8')) as {
    packages: PackageSources['packages']
  }
  return { moleculeRoot: MOLECULE, packages: registry.packages }
}

const sources = packageSources()

describe('the flagship templates', () => {
  it('are read from the molecule checkout beside mlcl, and there are many', () => {
    expect(existsSync(join(MOLECULE, 'packages')), `no molecule checkout at ${MOLECULE}`).toBe(true)
    expect(FLAGSHIPS.length).toBeGreaterThan(100)
  })

  it.each(FLAGSHIPS)('%s makes no request its API does not serve', (slug) => {
    const report = requestReport(join(APPS, slug), sources)
    // Without requests and routes the check would pass by reading nothing.
    expect(report.requests.length).toBeGreaterThan(0)
    expect(report.routes.length).toBeGreaterThan(0)
    expect(report.unanswered).toEqual([])
  })
})

// Known-bad copies the check must refuse: each is the crm template with one fix taken back out.
describe('a flagship that lost a route or a base its app relies on', () => {
  let scratch: string
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'mlcl-flagship-requests-'))
  })
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true })
  })

  /** A copy of crm's sources with one file's text changed. */
  function variant(name: string, file: string, change: (text: string) => string): string {
    const copy = join(scratch, name)
    for (const part of ['api/src', 'app/src', 'app/index.html']) {
      cpSync(join(APPS, 'crm', part), join(copy, part), { recursive: true })
    }
    const path = join(copy, file)
    const before = readFileSync(path, 'utf8')
    const after = change(before)
    expect(after, `${file} did not change`).not.toBe(before)
    writeFileSync(path, after)
    return copy
  }

  const unanswered = (copy: string): string[] =>
    unansweredRequests(copy, sources).map((request) => `${request.method} ${request.path}`)

  it('names the payment confirmation when the router does not mount it', () => {
    const copy = variant('no-verify-payment', 'api/src/App/router.ts', (text) =>
      text.replace(/^mountDefaultUserVerifyPaymentRoutes\(router, User\)\n/m, ''),
    )
    expect(unanswered(copy)).toEqual(['post /api/users/:param/verify-payment/:param'])
  })

  it('names the package requests that miss /api when no bond gives the HTTP client a base', () => {
    const copy = variant('no-http-base', 'app/src/bonds/auth-default.ts', () =>
      [
        "import { createDefaultAuthClientWithHttpSync } from '@molecule/app-bonds-default-react'",
        '',
        "import { authConfig } from '../config.js'",
        '',
        'export const { authClient, setupAuthDefault } = createDefaultAuthClientWithHttpSync(authConfig)',
        '',
      ].join('\n'),
    )
    expect(unanswered(copy)).toEqual(['post /users/:param/verify-payment/:param'])
  })

  it('names the OAuth start of a listed provider the API has no route for', () => {
    const copy = variant('oauth-provider-without-routes', 'app/src/config.ts', (text) =>
      text.replace(/oauthProviders: \[\]/, "oauthProviders: ['google']"),
    )
    expect(unanswered(copy)).toEqual(['get /api/users/oauth/:param'])
  })
})
