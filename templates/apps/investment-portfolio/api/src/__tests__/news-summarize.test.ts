import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import newsRouter from '../handlers/news.js'

/**
 * Regression test for the broken-access-control finding P4TPL3-1:
 * POST /api/news/:id/summarize triggers a metered LLM call and was reachable
 * anonymously, letting anyone run up the owner's AI bill. The handler must now
 * fail closed and return 401 when there is no authenticated session.
 *
 * The router is mounted without the auth middleware that would populate
 * `res.locals.session`, so every request here is unauthenticated — exactly the
 * abuse vector. Before the fix this fell through to `findById`; after the fix
 * it short-circuits with 401 before any AI/database work.
 */
describe('POST /news/:id/summarize — auth gate', () => {
  let server: ReturnType<express.Express['listen']>
  let baseUrl = ''

  beforeAll(async () => {
    const app = express()
    app.use('/news', newsRouter)
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const { port } = server.address() as AddressInfo
        baseUrl = `http://127.0.0.1:${port}`
        resolve()
      })
    })
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('rejects an unauthenticated summarize request with 401', async () => {
    const res = await fetch(`${baseUrl}/news/00000000-0000-0000-0000-000000000000/summarize`, {
      method: 'POST',
    })
    expect(res.status).toBe(401)
    const body = (await res.json()) as { error?: string }
    expect(body.error).toBeTruthy()
  })
})
