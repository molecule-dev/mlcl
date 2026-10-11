// @vitest-environment node
/**
 * The csv-import example's `POST /api/import/preview` — the handler the preview
 * SUMMARY is computed from.
 *
 * The page suite (`csv-import-preview-summary.test.ts`) hardcodes the endpoint's
 * ANSWER, so the arithmetic it describes was never exercised: `validateRows(rows
 * .slice(0, 50))` counts only the rows the response carries, while `totalRows` is
 * the WHOLE file, and `previewRows` is that same first page. A regression here
 * (validating every row, or reporting the page length as the total) changes the
 * verdict a reader gets about a file they are about to commit, and no test
 * noticed — the malformed-CSV 400 and the empty-body 400 were dead letters too.
 *
 * The real router is driven with the real `express.raw` middleware, so the body
 * has to arrive the way a client sends it (a text/csv stream).
 *
 * @module
 */

import { Readable } from 'node:stream'

import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))

type Handle = (req: unknown, res: unknown, next?: (error?: unknown) => void) => Promise<void> | void

/** The POST /preview middleware chain, in order, straight off the real router. */
const { previewMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/data-display/csv-import/api/handlers/import.js')) as {
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
  const layer = mod.default.stack.find((l) => l.route?.path === '/preview' && l.route.methods?.post)
  if (!layer?.route) throw new Error('the import router exported no POST /preview route')
  return { previewMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

interface Res {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  /** Called when the chain ANSWERED without advancing (see {@link preview}). */
  onRespond?: () => void
  status: (code: number) => Res
  json: (payload: unknown) => unknown
}

const makeRes = (userId: string | null = 'user-1'): Res => {
  const res: Res = {
    locals: {},
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      res.onRespond?.()
      return res
    },
  }
  if (userId !== null) res.locals.session = { userId }
  return res
}

/**
 * A request carrying `body` as the raw CSV an `express.raw` middleware reads.
 *
 * @param body - The request's bytes (empty for the "no file" case).
 * @returns A readable stream shaped like an Express request.
 */
function makeReq(body: Buffer): Readable & { headers: Record<string, string> } {
  const req = Readable.from([body]) as Readable & {
    headers: Record<string, string>
  }
  req.headers = { 'content-type': 'text/csv', 'content-length': String(body.length) }
  if (body.length === 0) req.headers['content-length'] = '0'
  return req
}

/** Run the whole /preview chain for `body` and return the response. */
async function preview(body: Buffer, userId: string | null = 'user-1'): Promise<Res> {
  const res = makeRes(userId)
  const req = makeReq(body)
  for (let i = 0; i < previewMiddlewares.length; i++) {
    const isLast = i === previewMiddlewares.length - 1
    if (isLast) {
      // The terminal handler calls no `next()`; settle on whatever it returns.
      await previewMiddlewares[i](req, res, () => undefined)
      break
    }
    // A middleware ADVANCES asynchronously: `express.raw` calls `next()` only
    // after the stream is read, and it returns nothing to await — so waiting on
    // a call to `next()` is what keeps the chain moving. A middleware that
    // ANSWERS instead (the 401 gate) never calls it, so the response itself is
    // the other way out.
    const advanced = await new Promise<boolean>((resolve) => {
      res.onRespond = () => resolve(false)
      const result = previewMiddlewares[i](req, res, () => resolve(true))
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void (result as Promise<unknown>).then(
          () => resolve(false),
          () => resolve(false),
        )
      }
    })
    res.onRespond = undefined
    if (!advanced) break
  }
  return res
}

/** A CSV with `count` rows, `invalid` of them with a malformed email. */
function csv(count: number, invalid = 0): Buffer {
  const lines = ['email,name']
  for (let i = 0; i < count; i++) {
    const email = i < invalid ? `not-an-email-${i}` : `user${i}@test.dev`
    lines.push(`${email},User ${i}`)
  }
  return Buffer.from(`${lines.join('\n')}\n`, 'utf8')
}

describe('csv-import POST /preview — the page the counts are computed from', () => {
  it('reports the whole file’s length but validates only the rows it returns', async () => {
    // 60 rows, the first two invalid: `totalRows` is the file (60), the counts
    // cover the 50-row preview the response carries (48 valid, 2 with errors).
    const res = await preview(csv(60, 2))

    const body = res.body as {
      totalRows: number
      previewRows: unknown[]
      valid: number
      invalid: unknown[]
    }
    expect(body.totalRows).toBe(60)
    expect(body.previewRows).toHaveLength(50)
    expect(body.valid).toBe(48)
    expect(body.invalid).toHaveLength(2)
  })

  it('reports errors that sit past the preview page as outside the counts', async () => {
    // The failure the page suite documents from the other side: a file whose
    // errors are all after row 50 is "50 valid, 0 with errors" — correct, and
    // exactly why the summary has to say which rows the counts cover.
    const lines = ['email,name']
    for (let i = 0; i < 50; i++) lines.push(`user${i}@test.dev,User ${i}`)
    for (let i = 50; i < 60; i++) lines.push(`broken-${i},User ${i}`)

    const body = (await preview(Buffer.from(`${lines.join('\n')}\n`))).body as {
      totalRows: number
      valid: number
      invalid: unknown[]
    }

    expect(body.totalRows).toBe(60)
    expect(body.valid).toBe(50)
    expect(body.invalid).toHaveLength(0)
  })

  it('answers 400 for a body it cannot parse instead of echoing the parser’s message', async () => {
    const res = await preview(Buffer.from('email,name\n"unterminated,Ada\n', 'utf8'))

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'Could not parse CSV' })
  })

  it('answers 400 for an empty body — no file, no preview', async () => {
    const res = await preview(Buffer.alloc(0))

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'No file uploaded' })
  })

  it('an unauthenticated preview is 401 and parses nothing', async () => {
    const res = await preview(csv(3), null)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required' })
  })
})
