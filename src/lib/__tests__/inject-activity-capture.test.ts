/**
 * IDE8 — activity-capture PRODUCER wiring (docs/BAAS-activity.md §3-4).
 *
 * Guards the producer half the audit found missing: the molecule.dev sandbox
 * already injects `MOLECULE_ACTIVITY_URL` and the `/v1/activity` ingest + SSE +
 * panel are built, but NOTHING in a scaffolded app read that env — no app called
 * `setSink(createHttpSink())` and no capture provider was bonded, so `record()`
 * always no-oped and the panel was always empty for real activity.
 *
 * Two layers:
 *  - injection: `injectActivityCaptureBoot` writes `_activity-capture.ts` and
 *    wires `setupActivityCapture()` as the LAST statement of `setupBonds()`,
 *    idempotently.
 *  - runtime: the produced module calls `setSink` AND routes the bonded email
 *    provider through the capture provider ONLY when `MOLECULE_ACTIVITY_URL` is
 *    set, and the full producer chain (sendMail → record → HTTP sink → fetch)
 *    POSTs the event to the configured ingest endpoint.
 *
 * The runtime layer also guards `MOLECULE_ACTIVITY_MODE`, which decides whether
 * a side effect is DELIVERED. `intercept` (the default, and what a dev sandbox
 * gets) REPLACES the real provider, so nothing is sent. `tee` (what a production
 * deploy gets) WRAPS it, so the real send happens and its real outcome is
 * recorded — a deployed app's emails must actually reach their recipients.
 */
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { injectActivityCaptureBoot } from '../scaffold.js'

/**
 * A minimal hand-curated `bonds/index.ts` shaped like every flagship ships: an
 * import block (external + relative groups) and a `setupBonds()` that wires the
 * real providers. The injection must add the producer import in its sorted slot
 * and the call as the LAST statement (after the real providers are bonded).
 */
const FIXTURE_BONDS_INDEX = `import { resolveAll } from '@molecule/api-secrets'

import { setupEmailsMailgun } from './emails-mailgun.js'

/**
 * Initialize all providers and service bonds.
 */
export async function setupBonds(): Promise<void> {
  await resolveAll(['MAILGUN_API_KEY'])
  setupEmailsMailgun()
}
`

describe('injectActivityCaptureBoot (IDE8 producer wiring)', () => {
  let apiDir: string

  beforeEach(() => {
    // The temp dir is deliberately IN this directory, not os.tmpdir(): the
    // tests dynamically `import()` the GENERATED `src/bonds/_activity-capture.ts`
    // so vitest transforms it, and files outside the workspace root are outside
    // vite's serve allow list. The flip side is that the tree must not litter:
    // sweep any dir a crashed or timed-out run left behind before making a new
    // one.
    for (const stale of readdirSync(import.meta.dirname)) {
      if (stale.startsWith('ide8-tmp-'))
        rmSync(join(import.meta.dirname, stale), { recursive: true, force: true })
    }
    apiDir = mkdtempSync(join(import.meta.dirname, 'ide8-tmp-'))
    mkdirSync(join(apiDir, 'src', 'bonds'), { recursive: true })
    writeFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), FIXTURE_BONDS_INDEX)
    // …and the api manifest every real workspace has: it is where the producer
    // module's `@molecule/api-activity*` imports are declared (see the suite's
    // "no package.json" case below).
    writeFileSync(
      join(apiDir, 'package.json'),
      `${JSON.stringify({ name: 'ide8-tmp' }, null, 2)}\n`,
    )
  })

  afterEach(() => {
    rmSync(apiDir, { recursive: true, force: true })
    delete process.env.MOLECULE_ACTIVITY_URL
    delete process.env.MOLECULE_VAULT_TOKEN
    delete process.env.MOLECULE_APP_ID
    delete process.env.MOLECULE_ACTIVITY_MODE
    vi.restoreAllMocks()
  })

  it('writes the producer module and wires setupBonds idempotently', async () => {
    const first = await injectActivityCaptureBoot(apiDir)
    expect(first).toBe(true)
    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(true)

    const index = readFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), 'utf-8')
    expect(index).toContain("import { setupActivityCapture } from './_activity-capture.js'")

    // The call must come AFTER the real providers so capturable categories can be
    // swapped, and inside setupBonds (before its closing brace).
    const callIdx = index.indexOf('await setupActivityCapture()')
    expect(callIdx).toBeGreaterThan(index.indexOf('setupEmailsMailgun()'))
    expect(callIdx).toBeGreaterThan(0)

    // Re-running is a no-op — never double-wires.
    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)
    const again = readFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), 'utf-8')
    expect(again.match(/await setupActivityCapture\(\)/g)).toHaveLength(1)
    expect(again.match(/from '\.\/_activity-capture\.js'/g)).toHaveLength(1)
  })

  it('leaves no producer module behind when bonds/index.ts cannot be wired', async () => {
    // Neither an import block to extend nor a `setupBonds()` to anchor the
    // call against — the injection cannot proceed.
    const unwireable = 'export const bonds: string[] = []\n'
    writeFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), unwireable)

    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)

    // The module statically imports @molecule/api-activity* — a stray copy
    // left behind here (written before the anchor checks, with no wiring and
    // no declared dependencies) failed the project's tsc with TS2307.
    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(false)
    expect(readFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), 'utf-8')).toBe(unwireable)
  })

  it('leaves no producer module behind when there is no setupBonds to anchor the call', async () => {
    writeFileSync(
      join(apiDir, 'src', 'bonds', 'index.ts'),
      "import { resolveAll } from '@molecule/api-secrets'\n\nexport const bonds = () => resolveAll([])\n",
    )

    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)
    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(false)
  })

  it('leaves no producer module behind when the api workspace has no package.json', async () => {
    // The manifest is where the module's `@molecule/api-activity*` imports are
    // DECLARED. `addActivityCaptureDependencies` reports "no manifest" by
    // returning false rather than throwing, so without the up-front refusal the
    // wiring landed with no rollback and no error: a project importing packages
    // nothing can declare or install (TS2307 / ERR_MODULE_NOT_FOUND), silently.
    rmSync(join(apiDir, 'package.json'))

    expect(await injectActivityCaptureBoot(apiDir)).toBe(false)

    expect(existsSync(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))).toBe(false)
    expect(readFileSync(join(apiDir, 'src', 'bonds', 'index.ts'), 'utf-8')).toBe(
      FIXTURE_BONDS_INDEX,
    )
  })

  it('no-op when MOLECULE_ACTIVITY_URL is unset: no sink, real provider untouched', async () => {
    await injectActivityCaptureBoot(apiDir)
    const mod = await import(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))
    const { bond, get, unbond } = await import('@molecule/api-bond')
    const { hasSink } = await import('@molecule/api-activity')

    unbond('activity-sink')
    unbond('email')
    const realEmail = {
      sendMail: async () => ({ accepted: ['u@e.com'], rejected: [], messageId: 'real-send' }),
    }
    bond('email', realEmail)
    delete process.env.MOLECULE_ACTIVITY_URL

    await mod.setupActivityCapture()

    expect(hasSink()).toBe(false)
    expect(get('email')).toBe(realEmail) // real provider stays bonded — never captured
  })

  it('boot wiring calls setSink + swaps capturable provider when MOLECULE_ACTIVITY_URL is set, and POSTs the captured event', async () => {
    await injectActivityCaptureBoot(apiDir)
    const mod = await import(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))
    const { bond, get, unbond } = await import('@molecule/api-bond')
    const { hasSink } = await import('@molecule/api-activity')

    unbond('activity-sink')
    unbond('email')
    const realEmail = {
      sendMail: async () => ({ accepted: ['u@e.com'], rejected: [], messageId: 'real-send' }),
    }
    bond('email', realEmail)

    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit): Promise<Response> =>
        new Response('{}', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    process.env.MOLECULE_ACTIVITY_URL = 'https://api.molecule.dev/v1/activity'
    process.env.MOLECULE_VAULT_TOKEN = 'mvt_test-token'
    process.env.MOLECULE_APP_ID = 'project-123'

    await mod.setupActivityCapture()

    // 1. The HTTP activity sink is bonded — record() is no longer a no-op.
    expect(hasSink()).toBe(true)

    // 2. The email category was swapped for the intercept-only capture provider.
    const email = get('email') as {
      sendMail: (m: unknown) => Promise<{ messageId: string }>
    }
    expect(email).not.toBe(realEmail)

    // 3. The full producer chain: a sendMail() is CAPTURED (synthetic success)
    //    and POSTed to the ingest endpoint with the runtime auth headers.
    const result = await email.sendMail({ to: 'user@example.com', subject: 'Welcome' })
    expect(result.messageId).toMatch(/^captured-/)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    // The call-count check above IS the guard — `.toBeDefined()` on the result
    // of `calls.at(0)` could never fail once it passed, and said nothing.
    const [url, init] = fetchMock.mock.calls.at(0) as [string, RequestInit]
    expect(url).toBe('https://api.molecule.dev/v1/activity')
    expect(init.method).toBe('POST')
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer mvt_test-token')
    expect(headers['X-Molecule-App-Id']).toBe('project-123')
    const event = JSON.parse(init.body as string) as { type: string; status: string }
    expect(event.type).toBe('email')
    expect(event.status).toBe('captured')

    unbond('activity-sink')
    unbond('email')
  })

  it('tee mode WRAPS the real provider: the side effect is delivered AND recorded', async () => {
    await injectActivityCaptureBoot(apiDir)
    const mod = await import(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))
    const { bond, get, unbond } = await import('@molecule/api-bond')

    unbond('activity-sink')
    unbond('email')
    const sendMail = vi.fn(async () => ({
      accepted: ['u@e.com'],
      rejected: [],
      messageId: 'real-send',
    }))
    const realEmail = { sendMail }
    bond('email', realEmail)

    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit): Promise<Response> =>
        new Response('{}', { status: 200 }),
    )
    vi.stubGlobal('fetch', fetchMock)

    process.env.MOLECULE_ACTIVITY_URL = 'https://api.molecule.dev/v1/activity'
    process.env.MOLECULE_VAULT_TOKEN = 'mvt_test-token'
    process.env.MOLECULE_APP_ID = 'project-123'
    // What a PRODUCTION deploy gets. Production side effects must be delivered
    // AND captured — never intercepted.
    process.env.MOLECULE_ACTIVITY_MODE = 'tee'

    await mod.setupActivityCapture()

    const email = get('email') as {
      sendMail: (m: unknown) => Promise<{ messageId: string }>
    }
    // Wrapped, not replaced.
    expect(email).not.toBe(realEmail)

    const result = await email.sendMail({ to: 'user@example.com', subject: 'Welcome' })

    // The REAL transport really sent it and the caller sees the REAL result —
    // a deployed app must never get a synthetic `captured-` id back.
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(result.messageId).toBe('real-send')

    // ...and the real delivery is still recorded, as 'sent' rather than 'captured'.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    // As above: the count is the guard, so no `.toBeDefined()` on the entry.
    const [, init] = fetchMock.mock.calls.at(0) as [string, RequestInit]
    const event = JSON.parse(init.body as string) as { type: string; status: string }
    expect(event.type).toBe('email')
    expect(event.status).toBe('sent')

    unbond('activity-sink')
    unbond('email')
  })

  it('an unrecognized MOLECULE_ACTIVITY_MODE falls back to intercept (the dev default)', async () => {
    await injectActivityCaptureBoot(apiDir)
    const mod = await import(join(apiDir, 'src', 'bonds', '_activity-capture.ts'))
    const { bond, get, unbond } = await import('@molecule/api-bond')

    unbond('activity-sink')
    unbond('email')
    const sendMail = vi.fn(async () => ({
      accepted: ['u@e.com'],
      rejected: [],
      messageId: 'real-send',
    }))
    bond('email', { sendMail })

    vi.stubGlobal(
      'fetch',
      vi.fn(async (): Promise<Response> => new Response('{}', { status: 200 })),
    )

    process.env.MOLECULE_ACTIVITY_URL = 'https://api.molecule.dev/v1/activity'
    process.env.MOLECULE_ACTIVITY_MODE = 'something-else'

    await mod.setupActivityCapture()

    const email = get('email') as {
      sendMail: (m: unknown) => Promise<{ messageId: string }>
    }
    const result = await email.sendMail({ to: 'user@example.com', subject: 'Welcome' })

    // Only the explicit 'tee' opts into delivery — anything else keeps the
    // "captured, not delivered" dev semantics this module shipped with.
    expect(result.messageId).toMatch(/^captured-/)
    expect(sendMail).not.toHaveBeenCalled()

    unbond('activity-sink')
    unbond('email')
  })
})
