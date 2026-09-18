/**
 * Regression: POST /videos must not let a caller publish onto a channel they
 * do not own (BAC / cross-owner channel write). The handler must verify that
 * the supplied channel_id belongs to the session user before creating the row.
 *
 * Fails before the ownership guard (the cross-owner POST returns 201 and a row
 * is created); passes after (403, no create).
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const OWNER = '00000000-0000-0000-0000-0000000000aa'
const ATTACKER = '00000000-0000-0000-0000-0000000000bb'
const OWNED_CHANNEL = '00000000-0000-0000-0001-0000000000c1'

// Session identity is controlled per-test via this mutable holder.
let currentUserId: string | null = ATTACKER

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => currentUserId,
  uuidParamSchema: { parse: (v: unknown) => v },
}))

const createMock = vi.fn(async (_table: string, _row: Record<string, unknown>) => ({
  data: { id: 'new-video' },
  affected: 1,
}))
const findByIdMock = vi.fn(async (_table: string, _id: string) => null as unknown)

vi.mock('@molecule/api-database', () => ({
  create: (table: string, row: Record<string, unknown>) => createMock(table, row),
  deleteById: vi.fn(),
  findById: (table: string, id: string) => findByIdMock(table, id),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(async () => ({ data: null, affected: 0 })),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateParams: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  validateQuery: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

vi.mock('@molecule/api-search', () => ({
  hasProvider: vi.fn(() => false),
  search: vi.fn(async () => ({ hits: [], total: 0 })),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const { default: videosRouter } = await import('../handlers/videos.js')
  const app = express()
  app.use(express.json())
  app.use('/videos', videosRouter)
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

beforeEach(() => {
  createMock.mockClear()
  findByIdMock.mockReset()
  currentUserId = ATTACKER
})

const postVideo = (body: Record<string, unknown>) =>
  fetch(`${baseUrl}/videos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('POST /videos channel ownership', () => {
  it('rejects publishing onto a channel the caller does not own (403, no create)', async () => {
    // Channel exists but is owned by OWNER; caller is ATTACKER.
    findByIdMock.mockImplementation(async (table: string) =>
      table === 'channels' ? { id: OWNED_CHANNEL, owner_id: OWNER } : null,
    )
    const res = await postVideo({ title: 'Hijacked', channel_id: OWNED_CHANNEL })
    expect(res.status).toBe(403)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the supplied channel_id does not exist', async () => {
    findByIdMock.mockImplementation(async () => null)
    const res = await postVideo({ title: 'Ghost', channel_id: OWNED_CHANNEL })
    expect(res.status).toBe(404)
    expect(createMock).not.toHaveBeenCalled()
  })

  it('allows a creator to publish onto their own channel (201)', async () => {
    currentUserId = OWNER
    findByIdMock.mockImplementation(async (table: string) =>
      table === 'channels' ? { id: OWNED_CHANNEL, owner_id: OWNER } : null,
    )
    const res = await postVideo({ title: 'Mine', channel_id: OWNED_CHANNEL })
    expect(res.status).toBe(201)
    expect(createMock).toHaveBeenCalledTimes(1)
    const [, row] = createMock.mock.calls[0]
    expect(row.user_id).toBe(OWNER)
    expect(row.channel_id).toBe(OWNED_CHANNEL)
  })

  it('allows creating a video with no channel_id (201, no channel lookup)', async () => {
    const res = await postVideo({ title: 'Unaffiliated' })
    expect(res.status).toBe(201)
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(findByIdMock).not.toHaveBeenCalled()
  })
})
