import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// flashcard_decks.card_count is a denormalized count kept in sync via a recount on both card
// create and delete. Deleting a card must recompute the deck's card_count from the remaining
// cards — otherwise the stored count drifts upward as cards are removed.

const db = {
  findById: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
  updateById: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  deleteMany: (...a: unknown[]) => db.deleteMany(...a),
  count: (...a: unknown[]) => db.count(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  create: (...a: unknown[]) => db.create(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'user-1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/decks.js'

function cardDeleteHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/:id/cards/:cardId' && l.route.methods.delete)
  if (!layer?.route) throw new Error('DELETE /:id/cards/:cardId not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
function makeRes() {
  const res = {
    statusCode: 200,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json() {
      return this
    },
    end() {
      return this
    },
  }
  return res
}
const deckUpdate = () =>
  db.updateById.mock.calls.find((c) => c[0] === 'flashcard_decks')?.[2] as
    { card_count?: number } | undefined

beforeEach(() => {
  vi.clearAllMocks()
  db.findById.mockResolvedValue({ id: 'c1', user_id: 'user-1', deck_id: 'd1' })
  db.deleteMany.mockResolvedValue({ affected: 1 })
  db.updateById.mockResolvedValue({ data: {} })
})

describe('card delete recomputes deck card_count', () => {
  it('sets card_count to the remaining count after delete', async () => {
    db.count.mockResolvedValue(3) // 3 cards remain
    const res = makeRes()
    await cardDeleteHandler()(
      { params: { id: 'd1', cardId: 'c1' } } as unknown as Request,
      res as unknown as Response,
    )
    expect(res.statusCode).toBe(204)
    expect(db.deleteMany).toHaveBeenCalled()
    expect(deckUpdate()?.card_count).toBe(3)
  })
})
