import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The cards.list_id FK is ON DELETE SET NULL, so deleting a list left its cards as list_id=NULL
// orphans — invisible on the board (cards are grouped by list, no backlog view) yet still counted
// in search/export. The list-delete handler must delete the list's cards too.

const db = {
  create: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  deleteById: (...a: unknown[]) => db.deleteById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  findOne: (...a: unknown[]) => db.findOne(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ requireUser: () => 'owner-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-realtime', () => ({ broadcast: vi.fn(() => Promise.resolve()) }))

import router from '../handlers/lists.js'

const LIST_ID = '11111111-1111-4111-8111-111111111111'

function deleteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id' && l.route.methods.delete)
  if (!layer?.route) throw new Error('DELETE /:id not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = { statusCode: 200, status: vi.fn(), json: vi.fn(), end: vi.fn() }
  res.status = vi.fn((c: number) => {
    res.statusCode = c
    return res
  }) as never
  res.end = vi.fn(() => res) as never
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  db.findOne.mockResolvedValue({ id: LIST_ID, board_id: 'board-1', owner_id: 'owner-1' })
  db.deleteMany.mockResolvedValue({ data: [] })
  db.deleteById.mockResolvedValue({ data: {} })
})

describe('deleting a list removes its cards', () => {
  it('deletes the cards scoped to the list, then the list', async () => {
    const res = makeRes()
    await deleteHandler()(
      { params: { id: LIST_ID } } as unknown as Request,
      res as unknown as Response,
    )
    expect(db.deleteMany).toHaveBeenCalledWith('cards', [
      { field: 'list_id', operator: '=', value: LIST_ID },
    ])
    expect(db.deleteById).toHaveBeenCalledWith('board_lists', LIST_ID)
    expect(res.statusCode).toBe(204)
  })
})
