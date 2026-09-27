import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Regression test for the receipts MIME allowlist: `mime_type` used to be
// stored and served exactly as the caller typed it, so a `text/html` or
// `image/svg+xml` receipt could become script-in-the-browser when the stored
// URL was later opened. Only four types are accepted now; the inline data:
// fallback derives its type from the allowlisted value.

vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: (res: { locals?: { session?: { userId?: string } } }) =>
    res.locals?.session?.userId ?? null,
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

// sharp is unavailable/flaky in CI — pass the buffer through untouched; the
// allowlist is what's under test, not the resize.
vi.mock('@molecule/api-image', () => ({
  resize: vi.fn(async (buffer: Buffer) => buffer),
}))

vi.mock('@molecule/api-uploads', () => ({
  // No bonded provider → the handler takes the inline data: URL fallback.
  hasProvider: vi.fn(() => false),
  getProvider: vi.fn(),
}))

vi.mock('@molecule/api-middleware-validation', () => ({
  validateBody: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

let server: Server
let baseUrl: string

beforeAll(async () => {
  const receipts = (await import('../handlers/receipts.js')).default

  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'user-1' }
    next()
  })
  app.use('/api/receipts', receipts)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
      resolve()
    })
  })
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  )
})

const post = (mime?: string): Promise<Response> =>
  fetch(`${baseUrl}/api/receipts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      image_base64: Buffer.from('fake-bytes').toString('base64'),
      ...(mime === undefined ? {} : { mime_type: mime }),
    }),
  })

describe('receipts accept only the allowlisted MIME types', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])(
    'allows %s and echoes it back',
    async (mime) => {
      const res = await post(mime)
      expect(res.status).toBe(201)
      const body = (await res.json()) as { mimeType?: string; url?: string }
      expect(body.mimeType).toBe(mime)
      // The data: fallback must derive its type from the allowlisted value.
      expect(body.url).toMatch(new RegExp(`^data:${mime.replace('/', '\\/')};base64,`))
    },
  )

  it.each(['text/html', 'image/svg+xml', 'application/zip', '../../../etc/passwd'])(
    'rejects %s with 400',
    async (mime) => {
      const res = await post(mime)
      expect(res.status).toBe(400)
      const body = (await res.json()) as { error?: string }
      expect(body.error).toBeTruthy()
    },
  )

  it('defaults to image/jpeg when no mime_type is sent', async () => {
    const res = await post()
    expect(res.status).toBe(201)
    const body = (await res.json()) as { mimeType?: string }
    expect(body.mimeType).toBe('image/jpeg')
  })
})
