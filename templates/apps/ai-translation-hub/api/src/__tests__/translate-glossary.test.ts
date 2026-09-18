import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The user's saved glossary_terms were never loaded/applied by /translate (the endpoint only applied
// a `glossary` body field that no client sent). Translate now loads the user's terms for the
// language pair and enforces them on the output.

const db = { findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findMany: (...a: unknown[]) => db.findMany(...a) }))
const translate = vi.fn(async () => ({
  translations: [{ text: 'Hola, mundo.', detectedSourceLang: 'es' }],
}))
vi.mock('@molecule/api-ai-translation', () => ({
  requireProvider: () => ({ name: 'mock-deepl', translate }),
}))
vi.mock('@molecule/api-ai', () => ({ getProvider: () => ({}), requireProvider: () => ({}) }))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'u1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_r: Request, _s: Response, n: () => void) => n(),
}))

import router from '../handlers/translations.js'

function translateHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/translate' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /translate not found')
  const s = layer.route.stack
  return s[s.length - 1].handle as (req: Request, res: Response) => Promise<void>
}
const makeRes = () => {
  const res = { statusCode: 200, body: undefined as unknown }
  return Object.assign(res, {
    status(c: number) {
      res.statusCode = c
      return res
    },
    json(o: unknown) {
      res.body = o
      return res
    },
    locals: { session: { userId: 'u1' } },
  }) as unknown as Response & { body: unknown }
}
const run = async (glossaryRows: unknown[]) => {
  db.findMany.mockResolvedValue(glossaryRows)
  const res = makeRes()
  await translateHandler()(
    { body: { text: 'Hello world', target_lang: 'es' } } as unknown as Request,
    res,
  )
  return res
}

beforeEach(() => vi.clearAllMocks())

describe('/translate applies the user’s saved glossary', () => {
  it('replaces a term per the stored glossary (mundo → planeta)', async () => {
    const res = await run([{ source_term: 'mundo', target_term: 'planeta' }])
    expect((res.body as { target_text: string }).target_text).toBe('Hola, planeta.')
  })

  it('loads glossary_terms scoped to the user + language pair', async () => {
    await run([])
    const call = db.findMany.mock.calls.find((c) => c[0] === 'glossary_terms')
    const where = (call?.[1] as { where?: Array<{ field: string; value: unknown }> }).where
    expect(where).toEqual(
      expect.arrayContaining([
        { field: 'user_id', operator: '=', value: 'u1' },
        { field: 'target_lang', operator: '=', value: 'es' },
        { field: 'source_lang', operator: '=', value: 'es' },
      ]),
    )
  })

  it('leaves the translation unchanged when the glossary is empty', async () => {
    const res = await run([])
    expect((res.body as { target_text: string }).target_text).toBe('Hola, mundo.')
  })
})
