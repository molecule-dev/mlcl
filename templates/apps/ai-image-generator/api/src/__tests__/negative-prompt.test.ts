import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// negativePrompt (and the active style's negative_modifier) were persisted on the
// generation row but never sent to the provider — only the positive prompt + style
// modifier reached provider.generate. Both generation paths now bake the negative
// into the prompt text (the image APIs expose no separate negative param).

// The queries reserveCredit runs inside its withTransaction().
const conn = { query: vi.fn() }
const db = {
  withTransaction: vi.fn(async (fn: () => Promise<unknown>) => fn()),
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  query: (...a: unknown[]) => conn.query(...a),
  withTransaction: (fn: () => Promise<unknown>) => db.withTransaction(fn),
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const generate = vi.fn(async (_params: { prompt: string }) => ({
  images: [{ url: 'https://img/x.png' }],
}))
vi.mock('@molecule/api-ai-image-generation', () => ({ getProvider: () => ({ generate }) }))
vi.mock('@molecule/api-ai', () => ({ getProvider: vi.fn(), getProviderByName: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: () => 'u1',
  idParamSchema: {},
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateQuery: () => (_req: Request, _res: Response, next: () => void) => next(),
  validateParams: () => (_req: Request, _res: Response, next: () => void) => next(),
}))

import router from '../handlers/generations.js'

type RouteLayer = {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
}
function handlerFor(path: string): (req: Request, res: Response) => Promise<void> {
  const layer = (router.stack as RouteLayer[]).find(
    (l) => l.route?.path === path && l.route.methods.post,
  )
  if (!layer?.route) throw new Error(`POST ${path} not found`)
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = (): { statusCode: number; body: unknown; status: unknown; json: unknown } => {
  const res = { statusCode: 201, body: undefined as unknown, status: vi.fn(), json: vi.fn() }
  res.status = vi.fn((c: number) => {
    res.statusCode = c
    return res
  }) as never
  res.json = vi.fn((b: unknown) => {
    res.body = b
    return res
  }) as never
  return res
}
const promptSent = (): string => generate.mock.calls[0]?.[0]?.prompt ?? ''

// reserveCredit's transaction: advisory lock, SUM(balance), INSERT RETURNING
function primeReserve(): void {
  conn.query
    .mockResolvedValueOnce({ rows: [], rowCount: null })
    .mockResolvedValueOnce({ rows: [{ balance: 1000 }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [{ id: 'led-1' }], rowCount: 1 })
}

beforeEach(() => {
  vi.clearAllMocks()
  db.create.mockResolvedValue({ data: { id: 'gen-x', status: 'succeeded' } })
  db.updateById.mockResolvedValue({ data: {} })
  generate.mockResolvedValue({ images: [{ url: 'https://img/x.png' }] })
})

describe('POST / bakes the negative prompt into the provider prompt', () => {
  it('appends an Avoid clause for an explicit body.negativePrompt', async () => {
    db.findById.mockResolvedValue({ id: 'u1', oauthData: {} }) // no active style
    primeReserve()
    await handlerFor('/')(
      { body: { prompt: 'a dog', negativePrompt: 'blurry, watermark' } } as unknown as Request,
      makeRes() as unknown as Response,
    )
    expect(generate).toHaveBeenCalledTimes(1)
    expect(promptSent()).toContain('a dog')
    expect(promptSent()).toContain('Avoid: blurry, watermark')
  })

  it('uses the active style negative_modifier when the body omits one', async () => {
    db.findById.mockImplementation((table: unknown) => {
      if (table === 'users')
        return Promise.resolve({ id: 'u1', oauthData: { activeStyleId: 'sp1' } })
      if (table === 'style_presets')
        return Promise.resolve({
          id: 'sp1',
          prompt_modifier: null,
          negative_modifier: 'low quality',
        })
      return Promise.resolve(null)
    })
    primeReserve()
    await handlerFor('/')(
      { body: { prompt: 'a dog' } } as unknown as Request,
      makeRes() as unknown as Response,
    )
    expect(promptSent()).toContain('Avoid: low quality')
  })

  it('leaves the prompt untouched when there is no negative', async () => {
    db.findById.mockResolvedValue({ id: 'u1', oauthData: {} })
    primeReserve()
    await handlerFor('/')(
      { body: { prompt: 'a dog' } } as unknown as Request,
      makeRes() as unknown as Response,
    )
    expect(promptSent()).toBe('a dog')
    expect(promptSent()).not.toContain('Avoid:')
  })
})

describe('variations honor the source generation negative prompt', () => {
  it('bakes the original row negative_prompt into each variation', async () => {
    db.findById.mockResolvedValue({
      id: 'gen-1',
      user_id: 'u1',
      provider: 'openai',
      size: '1024x1024',
      style: 'natural',
      prompt: 'a cat',
      model: 'reverie-xl-v3',
      negative_prompt: 'nsfw, extra limbs',
    })
    primeReserve()
    await handlerFor('/:id/variations')(
      { params: { id: 'gen-1' }, body: { count: 1 } } as unknown as Request,
      makeRes() as unknown as Response,
    )
    expect(generate).toHaveBeenCalledTimes(1)
    expect(promptSent()).toContain('a cat')
    expect(promptSent()).toContain('Avoid: nsfw, extra limbs')
  })
})
