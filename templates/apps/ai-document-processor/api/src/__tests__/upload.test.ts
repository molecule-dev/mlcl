import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/documents/upload: the shared upload parser stores the file, the handler reads the
// stored bytes back for the AI provider, and a failed document write frees the stored file.

const db = { create: vi.fn(), findById: vi.fn(), findMany: vi.fn(), updateById: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => db.create(...a),
  findById: (...a: unknown[]) => db.findById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
}))
const chat = vi.fn()
vi.mock('@molecule/api-ai', () => ({
  getProvider: () => ({ chat }),
  getProviderByName: () => null,
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'user-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import router from '../handlers/upload.js'

/** Upload storage in memory, so the test can see what was stored and removed. */
const stored = new Map<string, Buffer>()
const deleteFile = vi.fn(async (id: string) => {
  stored.delete(id)
})
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const id = `key-${stored.size + 1}`
    const chunks: Buffer[] = []
    const file: UploadedFile = {
      id,
      fieldname,
      filename: info.filename ?? 'upload',
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      uploaded: false,
    }
    file.uploadPromise = new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        stored.set(id, Buffer.concat(chunks))
        file.uploaded = true
        resolve()
      })
      stream.on('error', reject)
    })
    return file
  },
  abortUpload: vi.fn(),
  deleteFile,
  getFile: async (id: string) => Readable.from(stored.get(id) ?? Buffer.alloc(0)),
})

/** POST one file in the `file` field, as the Upload page sends it. */
async function post(bytes: string, type = 'text/plain') {
  const app = express()
  app.use('/', router)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    const form = new FormData()
    form.append('file', new Blob([bytes], { type }), 'invoice.txt')
    const res = await fetch(`http://127.0.0.1:${port}/`, { method: 'POST', body: form })
    const body = res.headers.get('content-type')?.includes('application/json')
      ? ((await res.json()) as Record<string, unknown>)
      : await res.text()
    return { status: res.status, body }
  } finally {
    server.close()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stored.clear()
  chat.mockImplementation(async function* () {
    yield { type: 'error', message: 'offline' }
  })
  db.create.mockImplementation(async (table: string) => ({ data: { id: `${table}-1` } }))
  db.updateById.mockResolvedValue({ data: {} })
  db.findById.mockResolvedValue({ id: 'documents-1', status: 'failed', title: 'invoice.txt' })
  db.findMany.mockResolvedValue([])
})

describe('POST /api/documents/upload', () => {
  it('stores the file and hands its stored bytes to the AI provider', async () => {
    const res = await post('Invoice #42 total 10.00')
    expect(res.status).toBe(201)
    expect(stored.get('key-1')?.toString()).toBe('Invoice #42 total 10.00')
    const request = chat.mock.calls[0][0] as { messages: Array<{ content: string }> }
    expect(request.messages[0].content).toContain('Invoice #42 total 10.00')
    expect(db.create).toHaveBeenCalledWith(
      'documents',
      expect.objectContaining({ s3_key: 'key-1', size_bytes: 23 }),
    )
  })

  it('frees the stored file when the document row cannot be written', async () => {
    db.create.mockRejectedValueOnce(new Error('db down'))
    const res = await post('hello')
    expect(res.status).toBe(500)
    expect(deleteFile).toHaveBeenCalledWith('key-1')
    expect(stored.size).toBe(0)
    expect(chat).not.toHaveBeenCalled()
  })

  it('keeps the recorded upload when its event cannot be written', async () => {
    db.create.mockImplementation(async (table: string, row: Record<string, unknown>) => {
      if (table === 'document_events') throw new Error('document event write failed')
      return { data: { ...row, id: 'documents-1' }, affected: 1 }
    })
    db.findById.mockRejectedValueOnce(new Error('document read failed'))
    const response = await post('retained document')
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({
      id: 'documents-1',
      download_url: '/api/documents/documents-1/download',
    })
    expect(stored.get('key-1')?.toString()).toBe('retained document')
  })

  it('keeps the recorded upload when response enrichment cannot read the row', async () => {
    db.create.mockImplementation(async (table: string, row: Record<string, unknown>) => ({
      data: { ...row, id: `${table}-1` },
      affected: 1,
    }))
    db.findById.mockResolvedValueOnce(null)
    const response = await post('retained document')
    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ id: 'documents-1', s3_key: 'key-1', status: 'failed' })
    expect(stored.get('key-1')?.toString()).toBe('retained document')
  })

  it('refuses a body that is not multipart before anything is stored', async () => {
    const app = express()
    app.use(express.json())
    app.use('/', router)
    const server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    try {
      const { port } = server.address() as AddressInfo
      const res = await fetch(`http://127.0.0.1:${port}/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      })
      expect(res.status).toBe(415)
      expect(stored.size).toBe(0)
    } finally {
      server.close()
    }
  })
})
