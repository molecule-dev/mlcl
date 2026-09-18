/**
 * Security regressions for the documents handler.
 *
 *  1. Cross-tenant S3-read IDOR: the object-storage key (`s3_key`) is NEVER
 *     taken from the client — a client-supplied value must be IGNORED and the
 *     server mints its own.
 *  2. Stored-XSS on the inline serve path: `GET /:id/raw` must ALWAYS send
 *     `X-Content-Type-Options: nosniff` and must NEVER echo a client-declared
 *     `text/html` MIME inline (it forces a safe type + download instead).
 *  3. `GET /:id/download` is always a forced attachment with an opaque type.
 */
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express from 'express'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createCalls: Array<{ table: string; data: Record<string, unknown> }> = []

// Mutable handle so individual tests can control the stored document row that
// findById('documents', …) returns for the serve routes.
let storedDoc: Record<string, unknown> | null = null

vi.mock('@molecule/api-database', () => ({
  create: vi.fn(async (table: string, data: Record<string, unknown>) => {
    createCalls.push({ table, data })
    return { data: { id: 'doc-1', ...data } }
  }),
  count: vi.fn(async () => 0),
  findById: vi.fn(async (table: string) => (table === 'documents' ? storedDoc : null)),
  findMany: vi.fn(async () => []),
  updateById: vi.fn(async (_t: string, _id: string, data: Record<string, unknown>) => ({
    data: { id: _id, ...data },
  })),
  deleteById: vi.fn(async () => undefined),
}))

vi.mock('@molecule/api-entitlements', () => ({
  enforceLimit: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
}))

vi.mock('@molecule/api-uploads', () => ({
  getProvider: vi.fn(() => ({
    // Always returns a tiny readable so the serve routes can set headers.
    getFile: vi.fn(async () => Readable.from(Buffer.from('<html>x</html>'))),
    deleteFile: vi.fn(),
    upload: vi.fn(),
  })),
  hasProvider: vi.fn(() => true),
}))

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? '',
}))

vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))

let server: Server
let baseUrl: string

beforeEach(async () => {
  createCalls.length = 0
  storedDoc = null
  const { default: documentsRouter } = await import('../handlers/documents.js')
  const app = express()
  app.use(express.json())
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'alice' }
    next()
  })
  app.use('/documents', documentsRouter)

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve())
  })
  const { port } = server.address() as AddressInfo
  baseUrl = `http://127.0.0.1:${port}`
})

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('documents.create — s3_key / mime IDOR fix', () => {
  it('IGNORES a client-supplied s3_key and mime, minting a server-side key', async () => {
    const res = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'evil.pdf',
        s3_key: 'victims-secret-object-key',
        mime: 'text/html',
      }),
    })

    expect(res.status).toBe(201)
    const docCreate = createCalls.find((c) => c.table === 'documents')
    expect(docCreate).toBeDefined()
    // The attacker's key must NOT be persisted.
    expect(docCreate!.data.s3_key).not.toBe('victims-secret-object-key')
    expect(String(docCreate!.data.s3_key)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
    // The client text/html mime must NOT be persisted.
    expect(docCreate!.data.mime).not.toBe('text/html')
    expect(docCreate!.data.mime).toBe('application/octet-stream')
    expect(docCreate!.data.user_id).toBe('alice')
  })
})

describe('documents.raw — stored-XSS hardening', () => {
  it('sends nosniff and does NOT echo a client text/html mime inline', async () => {
    storedDoc = {
      id: 'doc-1',
      user_id: 'alice',
      s3_key: 'server-key',
      // Even if a malicious mime somehow landed in the row, the serve path
      // must never honor it inline.
      mime: 'text/html',
      original_name: 'evil.html',
      title: 'evil',
    }

    const res = await fetch(`${baseUrl}/documents/doc-1/raw`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    // text/html must never be served (inline or otherwise).
    expect(res.headers.get('content-type')).not.toContain('text/html')
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    // Off-allowlist types are forced to download, never rendered inline.
    expect(res.headers.get('content-disposition')).toContain('attachment')
  })

  it('serves an allowlisted image inline with nosniff and the safe type', async () => {
    storedDoc = {
      id: 'doc-1',
      user_id: 'alice',
      s3_key: 'server-key',
      mime: 'image/png',
      original_name: 'scan.png',
      title: 'scan',
    }

    const res = await fetch(`${baseUrl}/documents/doc-1/raw`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('content-disposition')).toContain('inline')
  })
})

describe('documents.download — always a safe attachment', () => {
  it('forces attachment + opaque type + nosniff regardless of stored mime', async () => {
    storedDoc = {
      id: 'doc-1',
      user_id: 'alice',
      s3_key: 'server-key',
      mime: 'image/png',
      original_name: 'scan.png',
      title: 'scan',
    }

    const res = await fetch(`${baseUrl}/documents/doc-1/download`)
    expect(res.status).toBe(200)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-type')).toBe('application/octet-stream')
    expect(res.headers.get('content-disposition')).toContain('attachment')
  })
})
