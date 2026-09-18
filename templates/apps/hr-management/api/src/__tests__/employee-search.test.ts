import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The employee list schema declares `search`, but the handler never applied it — the search box
// returned every employee. `search` must filter (in-memory) by name / work email / title.

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
const decoratedEmployees = [
  { id: '1', first_name: 'Ann', last_name: 'Baker', work_email: 'ann@co.com', title: 'Engineer' },
  { id: '2', first_name: 'Bob', last_name: 'Carr', work_email: 'bob@co.com', title: 'Designer' },
  { id: '3', first_name: 'Cy', last_name: 'Ann', work_email: 'cy@co.com', title: 'Manager' },
]
vi.mock('../handlers/_decorate.js', () => ({
  buildLookups: vi.fn(async () => ({ decoratedEmployees })),
  decorateEmployee: (x: unknown) => x,
}))
vi.mock('../handlers/_seed.js', () => ({ ensureSeeded: vi.fn(async () => undefined) }))

import router from '../handlers/employees.js'

function listHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/' && l.route.methods.get)
  if (!layer?.route) throw new Error('GET / not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = { body: undefined as unknown, json: vi.fn(), status: vi.fn() }
  res.json = vi.fn((b: unknown) => {
    res.body = b
    return res
  })
  res.status = vi.fn(() => res)
  return res
}
const run = async (query: Record<string, unknown>) => {
  const res = makeRes()
  await listHandler()({ query } as unknown as Request, res as unknown as Response)
  return res.body as Array<{ id: string }>
}

beforeEach(() => vi.clearAllMocks())

describe('employee list search', () => {
  it('matches on first name (case-insensitive)', async () => {
    const rows = await run({ search: 'ann' })
    // "Ann" (first name) and "Cy Ann" (last name) both match — Bob does not.
    expect(rows.map((r) => r.id).sort()).toEqual(['1', '3'])
  })

  it('matches on title', async () => {
    const rows = await run({ search: 'designer' })
    expect(rows.map((r) => r.id)).toEqual(['2'])
  })

  it('returns everyone when search is absent', async () => {
    const rows = await run({})
    expect(rows).toHaveLength(3)
  })
})
