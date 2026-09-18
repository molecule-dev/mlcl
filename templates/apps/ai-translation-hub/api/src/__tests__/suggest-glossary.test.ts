import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The user's saved glossary_terms were never loaded/applied by /suggest — the AI reviewer could
// return a suggestion that contradicts approved terminology. Suggest now loads the user's terms for
// the language pair, steers the reviewer via the system prompt, and enforces them on the output
// (identical guarantee to /translate).

const db = { findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({ findMany: (...a: unknown[]) => db.findMany(...a) }))

// Capture the ai.chat() args + yield a fixed suggestion.
const chatArgs: Array<{ system: string; messages: unknown }> = []
const suggestionText = { value: 'Hola, mundo.' }
async function* chat(args: { system: string; messages: unknown }) {
  chatArgs.push(args)
  yield { type: 'text' as const, content: suggestionText.value }
}
vi.mock('@molecule/api-ai', () => ({
  getProvider: () => ({ chat }),
  requireProvider: () => ({ chat }),
}))
vi.mock('@molecule/api-ai-translation', () => ({ requireProvider: () => ({}) }))
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

function suggestHandler(): (req: Request, res: Response) => Promise<void> {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/suggest' && l.route.methods.post)
  if (!layer?.route) throw new Error('POST /suggest not found')
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
const run = async (glossaryRows: unknown[], body?: Record<string, unknown>) => {
  db.findMany.mockResolvedValue(glossaryRows)
  const res = makeRes()
  await suggestHandler()(
    { body: { source_text: 'Hello world', target_lang: 'es', ...body } } as unknown as Request,
    res,
  )
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  chatArgs.length = 0
  suggestionText.value = 'Hola, mundo.'
})

describe('/suggest applies the user’s saved glossary', () => {
  it('enforces a stored term on the AI suggestion (mundo → planeta)', async () => {
    const res = await run([{ source_term: 'mundo', target_term: 'planeta' }])
    expect((res.body as { suggestion: string }).suggestion).toBe('Hola, planeta.')
  })

  it('steers the reviewer by injecting the glossary into the system prompt', async () => {
    await run([{ source_term: 'mundo', target_term: 'planeta' }])
    expect(chatArgs[0]?.system).toContain('"mundo" → "planeta"')
  })

  it('loads glossary_terms scoped to the user + language pair', async () => {
    await run([], { source_lang: 'en' })
    const call = db.findMany.mock.calls.find((c) => c[0] === 'glossary_terms')
    const where = (call?.[1] as { where?: Array<{ field: string; value: unknown }> }).where
    expect(where).toEqual(
      expect.arrayContaining([
        { field: 'user_id', operator: '=', value: 'u1' },
        { field: 'target_lang', operator: '=', value: 'es' },
        { field: 'source_lang', operator: '=', value: 'en' },
      ]),
    )
  })

  it('leaves the suggestion unchanged and adds no glossary hint when empty', async () => {
    const res = await run([])
    expect((res.body as { suggestion: string }).suggestion).toBe('Hola, mundo.')
    expect(chatArgs[0]?.system).not.toContain('approved glossary')
  })
})
