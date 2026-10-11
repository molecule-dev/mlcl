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

const { indexMiddlewares, deleteMiddlewares, searchMiddlewares, askMiddlewares } =
  await (async () => {
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
    const routeOf = (path: string): Handle[] => {
      const layer = mod.default.stack.find((l) => l.route?.path === path && l.route.methods?.post)
      if (!layer?.route) throw new Error(`knowledge router exported no POST ${path} route`)
      return layer.route.stack.map((l) => l.handle)
    }
    const layer = mod.default.stack.find(
      (l) => l.route?.path === '/documents' && l.route.methods?.post,
    )
    if (!layer?.route) throw new Error('knowledge router exported no POST /documents route')
    const deleteLayer = mod.default.stack.find(
      (l) => l.route?.path === '/documents/:id' && l.route.methods?.delete,
    )
    if (!deleteLayer?.route)
      throw new Error('knowledge router exported no DELETE /documents/:id route')
    return {
      indexMiddlewares: layer.route.stack.map((l) => l.handle),
      deleteMiddlewares: deleteLayer.route.stack.map((l) => l.handle),
      searchMiddlewares: routeOf('/search'),
      askMiddlewares: routeOf('/ask'),
    }
  })()

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
  end: () => unknown
  ended: boolean
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
    statusCode: 0,
    body: undefined as unknown,
    ended: false,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
    end() {
      res.ended = true
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

/** DELETE one document through the real route chain; the terminal handler is awaited. */
async function requestDocumentDelete(id: string): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  res.locals.session = { userId: 'user-1' }
  const req = { params: { id } }
  for (let i = 0; i < deleteMiddlewares.length; i++) {
    let passedOn = false
    const result = deleteMiddlewares[i](req, res, () => {
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

/**
 * Drive one POST route end to end through its real middleware chain.
 *
 * @param middlewares - The route's own chain.
 * @param body - The request body.
 * @param userId - The session's user, or undefined for an unauthenticated request.
 * @returns The response object the chain wrote into.
 */
async function post(
  middlewares: Handle[],
  body: Record<string, unknown>,
  userId: string | null = 'user-1',
): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  if (userId !== null) res.locals.session = { userId }
  const req = { body }
  for (let i = 0; i < middlewares.length; i++) {
    let passedOn = false
    const result = middlewares[i](req, res, () => {
      passedOn = true
    })
    await Promise.resolve(result)
    if (!passedOn) break
  }
  return res
}

describe('semantic-search reads are scoped to the caller’s OWN chunks', () => {
  it('POST /search passes the session user’s filter to the retriever', async () => {
    // The module docblock's whole security model: "each chunk with `user_id`
    // (server-set from the session, never the client) … EVERY read is filtered
    // by it". Nothing drove /search or /ask, so the filter — the only thing
    // standing between one user's query and another user's documents in the
    // shared collection — could be dropped with the suite green.
    rag.retrieve.mockResolvedValue([{ text: 'mine', score: 0.9, metadata: { title: 't' } }])

    const res = await post(searchMiddlewares, { query: 'anything' })

    expect(rag.retrieve).toHaveBeenCalledWith({
      collection: 'knowledge',
      query: 'anything',
      filter: [{ field: 'user_id', operator: 'eq', value: 'user-1' }],
      topK: 5,
    })
    expect(res.body).toEqual({ hits: [{ text: 'mine', score: 0.9, title: 't' }] })
  })

  it('POST /ask passes the same filter to the answering bond', async () => {
    rag.answerQuestion.mockResolvedValue({
      answer: 'a',
      sources: [{ text: 'mine', score: 0.8, metadata: { title: 't' } }],
    })

    const res = await post(askMiddlewares, { question: 'why?' })

    expect(rag.answerQuestion).toHaveBeenCalledWith({
      collection: 'knowledge',
      question: 'why?',
      filter: [{ field: 'user_id', operator: 'eq', value: 'user-1' }],
    })
    expect(res.body).toEqual({ answer: 'a', sources: [{ text: 'mine', score: 0.8, title: 't' }] })
  })

  it('an unauthenticated read is 401 and never reaches the metered bond', async () => {
    const search = await post(searchMiddlewares, { query: 'anything' }, null)
    const ask = await post(askMiddlewares, { question: 'why?' }, null)

    expect(search.statusCode).toBe(401)
    expect(ask.statusCode).toBe(401)
    expect(rag.retrieve).not.toHaveBeenCalled()
    expect(rag.answerQuestion).not.toHaveBeenCalled()
  })

  it('a read over the budget is 429 before either bond is called', async () => {
    rateLimit.consume.mockResolvedValue({ allowed: false, retryAfter: 30 })

    const res = await post(searchMiddlewares, { query: 'anything' })

    expect(res.statusCode).toBe(429)
    expect(rag.retrieve).not.toHaveBeenCalled()
  })
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

  it('serializes two overlapping re-indexes of the SAME document', async () => {
    // The clear and the (re)index are two calls, and the bond offers no atomic
    // replace: two concurrent re-indexes of one document interleave
    // (A.delete, B.delete, A.index(len 50), B.index(len 10)) and A's chunks past
    // B's end survive with the text the user removed — exactly what the clear
    // above exists to prevent. The pair is chained per document instead.
    const events: string[] = []
    const releaseIndex: Array<() => void> = []
    rag.deleteDocument.mockImplementation(async () => {
      events.push('delete')
    })
    rag.indexDocument.mockImplementation(async () => {
      events.push('index:start')
      await new Promise<void>((resolve) => releaseIndex.push(resolve))
      events.push('index:end')
      return ['chunk']
    })

    const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve))
    const first = postDocument({ documentId: 'd1', text: 'a long first version' })
    const second = postDocument({ documentId: 'd1', text: 'short' })
    await flush()

    // Only ONE pair has started: the second waits for the first to finish.
    try {
      expect(events, 'the second replace must not start while the first is in flight').toEqual([
        'delete',
        'index:start',
      ])

      releaseIndex.shift()?.()
      await flush()
      expect(events).toEqual(['delete', 'index:start', 'index:end', 'delete', 'index:start'])

      releaseIndex.shift()?.()
    } finally {
      // Drain anything still parked — including on a FAILING assertion above.
      // The chain this test drives lives in the module (one promise per
      // document id), so a parked `user-1:d1` left behind by an early failure
      // makes every LATER test that posts d1 wait on a promise nobody will ever
      // resolve (a timeout in a suite that has nothing to do with this one).
      while (releaseIndex.length > 0) releaseIndex.shift()?.()
      await Promise.all([first, second])
    }
    expect(events).toEqual([
      'delete',
      'index:start',
      'index:end',
      'delete',
      'index:start',
      'index:end',
    ])
  })

  it('serializes a DELETE against an in-flight re-index of the same document', async () => {
    // The delete is a THIRD writer of this document's chunks. Run beside a
    // replace it landed between that pair's two calls (the clear above it, the
    // index below it), and the index wrote every chunk back — the endpoint
    // answered 204 over a document that was still searchable, and /ask kept
    // citing the text the user deleted. Riding the same per-document chain puts
    // the delete after the pair it raced, so it is the last write.
    const events: string[] = []
    const releaseIndex: Array<() => void> = []
    rag.deleteDocument.mockImplementation(async () => {
      events.push('delete')
    })
    rag.indexDocument.mockImplementation(async () => {
      events.push('index:start')
      await new Promise<void>((resolve) => releaseIndex.push(resolve))
      events.push('index:end')
      return ['chunk']
    })

    const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve))
    const indexing = postDocument({ documentId: 'd1', text: 'the text' })
    await flush()
    expect(events).toEqual(['delete', 'index:start'])

    const deleting = requestDocumentDelete('d1')
    // The parked replace is released in `finally`, whatever the assertion below
    // does: the chain is MODULE-level state, so a test that leaves it parked
    // wedges every later test that writes this document id.
    try {
      await flush()
      // The delete has NOT cleared yet: clearing here would be undone by the
      // index still parked above.
      expect(
        events,
        'the delete must wait for the in-flight replace rather than clear under it',
      ).toEqual(['delete', 'index:start'])
    } finally {
      releaseIndex.shift()?.()
      await Promise.all([indexing, deleting])
    }

    // …and it runs LAST, so what the endpoint reported deleted stays deleted.
    expect(events).toEqual(['delete', 'index:start', 'index:end', 'delete'])
    // The delete addresses the owner-namespaced id.
    expect(rag.deleteDocument).toHaveBeenLastCalledWith({
      collection: 'knowledge',
      documentId: 'user-1:d1',
    })
  })

  it('does not let a DIFFERENT document be held up by a parked one', async () => {
    // The chain is per document id, not a global lock: a slow replace of d1 must
    // not serialize d2 (the whole collection is shared).
    const releaseIndex: Array<() => void> = []
    rag.indexDocument.mockImplementation(async () => {
      await new Promise<void>((resolve) => releaseIndex.push(resolve))
      return ['chunk']
    })

    const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve))
    const slow = postDocument({ documentId: 'd1', text: 'first' })
    await flush()
    const other = postDocument({ documentId: 'd2', text: 'second' })
    await flush()

    // d2's pair ran while d1's index is still parked.
    try {
      expect(rag.indexDocument).toHaveBeenCalledTimes(2)
      // Release d2's index (the second parked one) and d1's.
      releaseIndex[1]?.()
      await flush()
      releaseIndex[0]?.()
    } finally {
      // Same drain as the serialization test above: both documents must be
      // released even when an assertion fails, or their chains stay pending for
      // every later test in the file.
      while (releaseIndex.length > 0) releaseIndex.shift()?.()
      await Promise.all([slow, other])
    }
  })

  it('reports a failed index instead of pretending the document is searchable', async () => {
    rag.indexDocument.mockRejectedValue(new Error('embedding provider down'))

    const res = await postDocument({ documentId: 'd1', text: 'text' })

    expect(res.statusCode).toBe(502)
    expect(logger.error).toHaveBeenCalledWith('kb index failed', expect.anything())
  })
})
