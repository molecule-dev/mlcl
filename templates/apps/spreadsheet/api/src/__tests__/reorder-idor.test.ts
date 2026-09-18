/**
 * Regression: the columns and sheets `/reorder` handlers must NOT renumber
 * a child row that belongs to a different parent/owner. They authorize only
 * the PATH parent (the sheet / the spreadsheet) and then loop the
 * client-supplied child id array — so without binding each id to the
 * authorized parent, an owner of sheet/workbook A could renumber another
 * tenant's columns/sheets by passing their ids (integrity IDOR).
 *
 * After the fix each handler fetches its parent's OWN children once, builds a
 * Set of valid ids, and skips any foreign id — while legitimate reordering of
 * the owner's own children keeps working. [RVALL reorder IDOR]
 */
import type { Server } from 'node:http'

import express, { type Express } from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const updateByIdMock = vi.fn(async (_table: string, _id: string, _update: unknown) => ({
  data: { id: _id },
  affected: 1,
}))
// ownedSheet / ensureOwnsSpreadsheet path — the PATH parent is always owned by
// our test user, so the parent authorization passes.
const findOneMock = vi.fn(
  async () => ({ id: 'parent-1', spreadsheet_id: 'ws-1', owner_id: 'user-1' }) as unknown,
)
// The authorized parent's OWN children. Only ids in here may be reordered.
const findManyMock = vi.fn(async () => [{ id: 'own-a' }, { id: 'own-b' }] as unknown[])

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async () => ({ data: { id: 'new-id' }, affected: 1 })),
  updateById: updateByIdMock,
  findOne: findOneMock,
  findMany: findManyMock,
  deleteById: vi.fn(async () => ({ data: null, affected: 1 })),
  count: vi.fn(async () => 0),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _vars?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

vi.mock('@molecule/api-bonds-default-express', () => ({
  requireUser: (res: {
    locals?: { session?: { userId?: string } }
    status: (n: number) => { json: (b: unknown) => void }
  }) => {
    const id = res.locals?.session?.userId
    if (!id) {
      res.status(401).json({ error: 'Unauthorized' })
      return null
    }
    return id
  },
}))

// safeBroadcast must be a no-op so the handler does not require a realtime bond.
vi.mock('../lib/safe-realtime.js', () => ({ safeBroadcast: vi.fn(async () => {}) }))

const OWN_A = '11111111-1111-4111-8111-111111111111'
const OWN_B = '22222222-2222-4222-8222-222222222222'
const FOREIGN = '99999999-9999-4999-8999-999999999999'

let app: Express
let server: Server
let baseUrl: string

beforeAll(async () => {
  const columnsRouter = (await import('../handlers/columns.js')).default
  const sheetsRouter = (await import('../handlers/sheets.js')).default
  app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'user-1' }
    next()
  })
  app.use('/api/columns', columnsRouter)
  app.use('/api/sheets', sheetsRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

afterAll(() => {
  server?.close()
})

beforeEach(() => {
  vi.clearAllMocks()
  findOneMock.mockResolvedValue({
    id: 'parent-1',
    spreadsheet_id: 'ws-1',
    owner_id: 'user-1',
  } as unknown)
  findManyMock.mockResolvedValue([{ id: OWN_A }, { id: OWN_B }] as unknown[])
})

describe('columns /reorder — cross-sheet IDOR', () => {
  it('ignores a foreign column id but still reorders the owner own columns', async () => {
    const res = await fetch(`${baseUrl}/api/columns/reorder`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sheet_id: '33333333-3333-4333-8333-333333333333',
        ids: [OWN_B, FOREIGN, OWN_A],
      }),
    })
    expect(res.status).toBe(200)
    const updatedIds = updateByIdMock.mock.calls.map((c) => c[1])
    // Foreign id never touched; both owned ids reordered.
    expect(updatedIds).not.toContain(FOREIGN)
    expect(updatedIds).toEqual(expect.arrayContaining([OWN_A, OWN_B]))
    expect(updateByIdMock).toHaveBeenCalledTimes(2)
  })
})

describe('sheets /reorder — cross-spreadsheet IDOR', () => {
  it('ignores a foreign sheet id but still reorders the owner own sheets', async () => {
    const res = await fetch(`${baseUrl}/api/sheets/reorder`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        spreadsheet_id: '44444444-4444-4444-8444-444444444444',
        sheets: [
          { id: OWN_B, position: 0 },
          { id: FOREIGN, position: 1 },
          { id: OWN_A, position: 2 },
        ],
      }),
    })
    expect(res.status).toBe(200)
    const updatedIds = updateByIdMock.mock.calls.map((c) => c[1])
    expect(updatedIds).not.toContain(FOREIGN)
    expect(updatedIds).toEqual(expect.arrayContaining([OWN_A, OWN_B]))
    expect(updateByIdMock).toHaveBeenCalledTimes(2)
  })
})
