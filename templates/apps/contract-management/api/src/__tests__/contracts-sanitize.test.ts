import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Stored-XSS regression test (SEC4) — server trust boundary.
 *
 * A malicious client can POST arbitrary `body_html` straight to the API,
 * bypassing the editor's escaping. The contract handler must sanitize it
 * BEFORE persisting, because it is later rendered (including to counterparties)
 * via `dangerouslySetInnerHTML`. This is a true integration test: it drives the
 * real Express router + handler logic and asserts the value actually handed to
 * the datastore `create`/`updateById` is sanitized — the wiring that was
 * missing when this shipped.
 */

const create = vi.fn(async (_table: string, data: Record<string, unknown>) => ({
  data: { id: '11111111-1111-4111-8111-111111111111', ...data },
  affected: 1,
}))
const updateById = vi.fn(async (_table: string, id: string, data: Record<string, unknown>) => ({
  data: { id, ...data },
  affected: 1,
}))

vi.mock('@molecule/api-database', () => ({
  create,
  updateById,
  count: vi.fn(async () => 0),
  findById: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
  deleteById: vi.fn(),
}))

vi.mock('@molecule/api-emails', () => ({ sendMail: vi.fn(async () => ({})) }))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

// validateBody is passthrough — the handler reads req.body directly; we send a
// well-formed body, so skipping schema validation does not change the path.
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}))

// Authenticate a fixed user for every route.
vi.mock('@molecule/api-resource-user', () => ({
  authorizers: {
    auth: () => (_req: Request, res: Response, next: NextFunction) => {
      res.locals.session = { userId: 'user-1' }
      next()
    },
  },
}))

const CONTRACT_ID = '33333333-3333-4333-8333-333333333333'

vi.mock('../lib/authz.js', () => ({
  requireUserOwnership: vi.fn(async () => ({
    ok: true,
    row: { id: CONTRACT_ID, version: 1, body_html: '', status: 'draft' },
  })),
}))

const XSS_HTML =
  '<p>hi</p><script>window.__pwned=1</script><img src=x onerror="window.__pwned=1"><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">x</a>'

async function buildApp(): Promise<Express> {
  const { default: contracts } = await import('../handlers/contracts.js')
  const app = express()
  app.use(express.json())
  app.use('/contracts', contracts)
  return app
}

function lastBodyHtml(mockFn: typeof create | typeof updateById, argIndex: number): string {
  const calls = mockFn.mock.calls
  const data = calls[calls.length - 1]?.[argIndex] as { body_html?: string } | undefined
  return data?.body_html ?? ''
}

function expectSanitized(stored: string): void {
  const lower = stored.toLowerCase()
  expect(lower).not.toContain('<script')
  expect(lower).not.toContain('onerror')
  expect(lower).not.toContain('<iframe')
  expect(lower).not.toContain('javascript:')
  expect(stored).toContain('<p>hi</p>')
}

describe('contracts handler — body_html sanitization (SEC4)', () => {
  beforeEach(() => {
    create.mockClear()
    updateById.mockClear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sanitizes body_html before persisting on create', async () => {
    const app = await buildApp()
    const server = app.listen(0)
    const port = (server.address() as { port: number }).port
    try {
      const r = await fetch(`http://127.0.0.1:${port}/contracts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: 'NDA', body_html: XSS_HTML }),
      })
      expect(r.status).toBe(201)
      expect(create).toHaveBeenCalled()
      expectSanitized(lastBodyHtml(create, 1))
    } finally {
      server.close()
    }
  })

  it('sanitizes body_html before persisting on update', async () => {
    const app = await buildApp()
    const server = app.listen(0)
    const port = (server.address() as { port: number }).port
    try {
      const r = await fetch(`http://127.0.0.1:${port}/contracts/${CONTRACT_ID}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body_html: XSS_HTML }),
      })
      expect(r.status).toBe(200)
      expect(updateById).toHaveBeenCalled()
      expectSanitized(lastBodyHtml(updateById, 2))
    } finally {
      server.close()
    }
  })
})
