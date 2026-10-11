/**
 * Re-indexing a document REPLACES it — it must not leave the previous text behind.
 *
 * `POST /api/kb/documents` addresses a document by `${userId}:${documentId}`, and
 * `@molecule/api-ai-rag-qa`'s `indexDocument` upserts chunks under DETERMINISTIC
 * ids (`${documentId}::<i>`). Indexing the same documentId again with a shorter
 * or edited text therefore overwrote chunks 0..n-1 and left every chunk past the
 * new end in place — with the OLD content and title. `/ask` and `/search` are
 * scoped to the caller's own chunks and returned that removed text, and each
 * shrinking re-index accumulated more of it. The handler now clears the
 * document's chunks first (`deleteDocument`), so the index holds exactly what was
 * submitted; a failed `indexDocument` then leaves the document unindexed (the
 * 502 is the retry) rather than half-replaced.
 *
 * The handler is driven through its REAL router, with only the bonds mocked.
 *
 * @module
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

const rag = vi.hoisted(() => ({
  answerQuestion: vi.fn(),
  deleteDocument: vi.fn(),
  indexDocument: vi.fn(),
  retrieve: vi.fn(),
}))
const logger = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
}))
const rateLimit = vi.hoisted(() => ({ consume: vi.fn() }))

vi.mock('@molecule/api-ai-rag-qa', () => rag)
vi.mock('@molecule/api-bond', () => ({ getLogger: () => logger }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-rate-limit', () => rateLimit)

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void> | void

const { indexMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/search/semantic-search/api/handlers/knowledge.js')) as {
      default: {
        stack: Array<{
          route?: {
            path?: string
            methods?: Record<string, boolean>
            stack: Array<{ handle: Handle }>
          }
        }>
      }
    }
  const layer = mod.default.stack.find(
    (l) => l.route?.path === '/documents' && l.route.methods?.post,
  )
  if (!layer?.route) throw new Error('knowledge router exported no POST /documents route')
  return { indexMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

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

/** POST one document through the real route chain; the terminal handler is awaited. */
async function postDocument(body: Record<string, unknown>): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  res.locals.session = { userId: 'user-1' }
  const req = { body }
  for (let i = 0; i < indexMiddlewares.length; i++) {
    let passedOn = false
    const result = indexMiddlewares[i](req, res, () => {
      passedOn = true
    })
    await Promise.resolve(result)
    if (!passedOn) break
  }
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  rag.indexDocument.mockResolvedValue(['user-1:d1::0', 'user-1:d1::1'])
  rag.deleteDocument.mockResolvedValue(undefined)
  rateLimit.consume.mockResolvedValue({ allowed: true })
})

describe('semantic-search POST /documents — a re-index replaces the document', () => {
  it('clears the document’s chunks BEFORE indexing, so no stale chunk survives', async () => {
    const res = await postDocument({ documentId: 'd1', text: 'the current text' })

    expect(res.body).toEqual({ chunks: 2 })
    // The owner-namespaced id both calls address.
    expect(rag.deleteDocument).toHaveBeenCalledWith({
      collection: 'knowledge',
      documentId: 'user-1:d1',
    })
    expect(rag.indexDocument).toHaveBeenCalledWith(
      expect.objectContaining({ collection: 'knowledge', documentId: 'user-1:d1' }),
    )
    // ORDER is the point: indexing first would re-create the chunks the clear
    // then removes.
    expect(rag.deleteDocument.mock.invocationCallOrder[0]).toBeLessThan(
      rag.indexDocument.mock.invocationCallOrder[0]!,
    )
  })

  it('clears again on every re-index of the same document (the shrinking-edit case)', async () => {
    // The user edits d1 twice. Without the clear, the second (shorter) text left
    // the chunks past its end behind, still retrievable by /search and /ask.
    rag.indexDocument.mockResolvedValue(['user-1:d1::0'])
    await postDocument({ documentId: 'd1', text: 'first version' })
    rag.indexDocument.mockResolvedValue(['user-1:d1::0'])
    await postDocument({ documentId: 'd1', text: 'second, shorter' })

    expect(rag.deleteDocument).toHaveBeenCalledTimes(2)
    for (const call of rag.deleteDocument.mock.calls) {
      expect(call[0]).toEqual({ collection: 'knowledge', documentId: 'user-1:d1' })
    }
  })

  it('reports a failed index instead of pretending the document is searchable', async () => {
    rag.indexDocument.mockRejectedValue(new Error('embedding provider down'))

    const res = await postDocument({ documentId: 'd1', text: 'text' })

    expect(res.statusCode).toBe(502)
    expect(logger.error).toHaveBeenCalledWith('kb index failed', expect.anything())
  })
})
