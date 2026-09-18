import express, { type Express } from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Stored-XSS regression test (SEC4) — server trust boundary.
 *
 * A malicious client can POST arbitrary `body_html` straight to the API,
 * bypassing the editor's escaping. The handler must sanitize it BEFORE it is
 * persisted, because it is later rendered to other space members via
 * `dangerouslySetInnerHTML`. This is a true integration test: it drives the
 * real Express router + zod validation + handler logic and asserts the value
 * actually handed to the datastore `create`/`updateById` is sanitized — the
 * exact wiring that was missing when this shipped.
 */

const create = vi.fn(async (_table: string, data: Record<string, unknown>) => ({
  data: { id: '11111111-1111-1111-1111-111111111111', ...data },
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
  deleteById: vi.fn(),
  findOne: vi.fn(async () => null),
  findMany: vi.fn(async () => []),
}))

// The create route is fronted by an enforceLimit tier gate; pass it through so this test isolates
// the sanitization concern (the tier gate has its own coverage in tier-limits.test.ts).
vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

const SPACE_ID = '22222222-2222-4222-8222-222222222222'
const ARTICLE_ID = '33333333-3333-4333-8333-333333333333'

// Authenticate a fixed user and grant access; everything else (the real
// sanitization + persistence) runs through the handler unchanged.
vi.mock('../lib/authz.js', () => ({
  requireUser: () => 'user-1',
  requireSpaceWriteAccess: vi.fn(async () => ({ id: SPACE_ID })),
  requireWritableArticle: vi.fn(async () => ({
    id: ARTICLE_ID,
    space_id: SPACE_ID,
    status: 'draft',
    body_md: '',
    body_html: '',
    published_at: null,
  })),
  requireReadableArticle: vi.fn(async () => null),
  requireSpaceMembership: vi.fn(async () => null),
  internalError: (res: { status: (n: number) => { json: (b: unknown) => void } }, err: unknown) =>
    res.status(500).json({ error: String(err) }),
  validationError: (
    res: { status: (n: number) => { json: (b: unknown) => void } },
    issues: unknown,
  ) => res.status(400).json({ error: 'validation', issues }),
}))

const XSS_HTML =
  '<p>hi</p><script>window.__pwned=1</script><img src=x onerror="window.__pwned=1"><iframe src="https://evil.example"></iframe><a href="javascript:alert(1)">x</a>'

async function buildApp(): Promise<Express> {
  const { default: articles } = await import('../handlers/articles.js')
  const app = express()
  app.use(express.json())
  app.use('/articles', articles)
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
  // Benign content survives.
  expect(stored).toContain('<p>hi</p>')
}

describe('articles handler — body_html sanitization (SEC4)', () => {
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
      const r = await fetch(`http://127.0.0.1:${port}/articles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ space_id: SPACE_ID, title: 'T', body_html: XSS_HTML }),
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
      const r = await fetch(`http://127.0.0.1:${port}/articles/${ARTICLE_ID}`, {
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
