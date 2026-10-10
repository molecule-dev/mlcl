/**
 * The csv-import example's `POST /commit` resolves each row's existence
 * individually — one `findMany` per row before its write. The upload cap is
 * express `raw({ limit: '10mb' })`, i.e. tens of thousands of rows, so the
 * request cost TWO database round-trips per row (one held connection, minutes
 * of work): the classic N+1, on teaching code weak executors copy into real
 * apps.
 *
 * The fix resolves existence in CHUNKS with one `in` query per chunk and keeps
 * the writes per-row (the abstract DataStore has no bulk write). This drives
 * the REAL router (only the bonds are mocked) and asserts both halves:
 * the find count is per-CHUNK, not per-row, and the upsert semantics are
 * unchanged — existing emails update, new ones create with `user_id`, and a
 * duplicate later in the SAME file updates the row the earlier row created
 * instead of making a second one.
 *
 * @module
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface CustomerRow {
  id: string
  user_id: string
  email: string
  name: string
  company: string
  created_at: string
}

const database = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  updateById: vi.fn(),
}))

vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))

type Handle = (req: unknown, res: unknown, next: () => void) => Promise<void> | void

/** The terminal POST /commit handler, off the real router's layer stack. */
const { commitHandler, requireAuth } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/data-display/csv-import/api/handlers/import.js')) as {
      default: { stack: Array<{ route?: { path?: string; stack: Array<{ handle: Handle }> } }> }
    }
  const layers = mod.default.stack.filter((l) => l.route?.path === '/commit')
  if (layers.length === 0) throw new Error('csv-import router exported no /commit route')
  const chain = layers[0]!.route!.stack.map((l) => l.handle)
  // [requireAuth, express.raw, handler] — express.raw is express's own body
  // parser, not the code under test; the handler is driven with a Buffer body
  // directly (it guards with Buffer.isBuffer itself).
  return { requireAuth: chain[0]!, commitHandler: chain[chain.length - 1]! }
})()

const csv = (rows: Array<[email: string, name: string]>): Buffer => {
  const lines = ['email,name,company', ...rows.map(([e, n]) => `${e},${n},`)]
  return Buffer.from(lines.join('\n'))
}

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

/** In-memory per-user customer table the mocked database bond serves. */
let table: CustomerRow[]
let nextId: number

beforeEach(() => {
  vi.clearAllMocks()
  table = []
  nextId = 1
  const userIdMatch = (where: Array<{ field: string; operator: string; value: unknown }>): string =>
    where.find((c) => c.field === 'user_id')!.value as string
  database.findMany.mockImplementation(
    async (
      _table: string,
      {
        where,
      }: {
        where: Array<{
          field: string
          operator: string
          value: unknown
        }>
      },
    ) => {
      const userId = userIdMatch(where)
      const inCond = where.find((c) => c.operator === 'in')
      const emails = (inCond?.value as string[] | undefined) ?? []
      return table.filter((row) => row.user_id === userId && emails.includes(row.email))
    },
  )
  database.create.mockImplementation(
    async (
      _table: string,
      data: Record<string, unknown>,
    ): Promise<{ data: CustomerRow; affected: number }> => {
      const row: CustomerRow = {
        id: `c${nextId++}`,
        user_id: String(data.user_id),
        email: String(data.email),
        name: String(data.name),
        company: String(data.company ?? ''),
        created_at: String(data.created_at),
      }
      table.push(row)
      return { data: row, affected: 1 }
    },
  )
  database.updateById.mockImplementation(
    async (
      _table: string,
      id: string,
      data: Record<string, unknown>,
    ): Promise<{ data: CustomerRow | null; affected: number }> => {
      const row = table.find((r) => r.id === id)
      if (!row) return { data: null, affected: 0 }
      Object.assign(row, data)
      return { data: row, affected: 1 }
    },
  )
})

async function commit(
  rows: Array<[string, string]>,
  userId = 'user-1',
): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  res.locals.session = { userId }
  const req = { body: csv(rows) }
  await requireAuth(req, res, () => void 0)
  await commitHandler(req, res, () => void 0)
  return res
}

describe('csv-import POST /commit — existence is resolved per chunk, not per row', () => {
  it('sends one `in` existence query per 500-row chunk, never one find per row', async () => {
    const rows: Array<[string, string]> = Array.from({ length: 1200 }, (_, i) => [
      `e${i}@example.test`,
      `name ${i}`,
    ])
    const res = await commit(rows)

    expect(res.statusCode).toBe(0)
    // 1200 rows → 3 chunks (500/500/200) → 3 existence queries.
    expect(database.findMany).toHaveBeenCalledTimes(3)
    const firstWhere = database.findMany.mock.calls[0]![1].where as Array<{
      field: string
      operator: string
      value: unknown
    }>
    expect(firstWhere.find((c) => c.operator === 'in')?.value).toContain('e0@example.test')
    // All rows new: one create each, no updates.
    expect(res.body).toMatchObject({ imported: 1200, updated: 0 })
    expect(database.create).toHaveBeenCalledTimes(1200)
    expect(database.updateById).not.toHaveBeenCalled()
  })

  it('keeps the upsert semantics: existing updates, new creates, same-file duplicate updates the created row', async () => {
    table.push({
      id: 'existing-1',
      user_id: 'user-1',
      email: 'known@example.test',
      name: 'old name',
      company: '',
      created_at: '2026-01-01T00:00:00.000Z',
    })

    // New email, then the same email AGAIN later in the file, plus a known one.
    const res = await commit([
      ['fresh@example.test', 'fresh v1'],
      ['known@example.test', 'known updated'],
      ['fresh@example.test', 'fresh v2'],
    ])

    // fresh: created once, then the duplicate updated that row (no second
    // create) — exactly what the old per-row find observed.
    expect(res.body).toMatchObject({ imported: 1, updated: 2 })
    expect(database.create).toHaveBeenCalledTimes(1)
    const created = table.find((r) => r.email === 'fresh@example.test')
    expect(created?.name).toBe('fresh v2')
    expect(created?.user_id).toBe('user-1')
    const known = table.find((r) => r.email === 'known@example.test')
    expect(known?.name).toBe('known updated')
  })

  it('rejects an unauthenticated caller before any query', async () => {
    const res = makeRes()
    const req = { body: csv([['a@example.test', 'a']]) }
    await requireAuth(req, res, () => void 0)
    expect(res.statusCode).toBe(401)
    expect(database.findMany).not.toHaveBeenCalled()
  })
})
