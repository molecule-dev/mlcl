import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express, { type Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import attachments from '../../../templates/.agents/skills/examples/uploads/file-attachments/api/handlers/attachments.js'
import avatars from '../../../templates/.agents/skills/examples/uploads/profile-photo-upload/api/handlers/upload.js'

const db = {
  create: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
  deleteById: vi.fn(),
}
vi.mock('@molecule/api-database', () => ({
  create: (...args: unknown[]) => db.create(...args),
  findById: (...args: unknown[]) => db.findById(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  deleteById: (...args: unknown[]) => db.deleteById(...args),
}))

const files = new Map<string, Buffer>()
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const chunks: Buffer[] = []
    const file: UploadedFile = {
      id: 'stored-file',
      fieldname,
      filename: info.filename ?? '',
      mimetype: info.mimeType,
      encoding: info.encoding,
      size: 0,
      uploaded: false,
    }
    file.uploadPromise = new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('error', reject)
      stream.on('end', () => {
        const bytes = Buffer.concat(chunks)
        files.set(file.id, bytes)
        file.size = bytes.length
        file.uploaded = true
        resolve()
      })
    })
    return file
  },
  abortUpload: () => {},
  async deleteFile(id) {
    files.delete(id)
  },
  async getFile(id) {
    const bytes = files.get(id)
    return bytes ? Readable.from(bytes) : null
  },
})

async function request<T>(
  router: Router,
  path: string,
  init: RequestInit,
  consume: (response: Response) => Promise<T>,
  role = 'member',
): Promise<T> {
  const app = express()
  app.use((_req, res, next) => {
    res.locals.session = { userId: 'user-1', role }
    next()
  })
  app.use(router)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    return await consume(await fetch(`http://127.0.0.1:${port}${path}`, init))
  } finally {
    server.close()
  }
}

function form(type: string, fields: Record<string, string> = {}): FormData {
  const body = new FormData()
  for (const [name, value] of Object.entries(fields)) body.append(name, value)
  body.append('file', new Blob(['test file'], { type }), 'file.pdf')
  return body
}

const status = async (response: Response): Promise<number> => {
  await response.arrayBuffer()
  return response.status
}

beforeEach(() => {
  vi.resetAllMocks()
  files.clear()
})

describe('digital-downloads example', () => {
  const loadProducts = (): Promise<{ default: Router }> =>
    import('../../../templates/.agents/skills/examples/commerce/digital-downloads/api/handlers/products.js')

  it('mounts and lets an admin store a supported file without exposing its provider id', async () => {
    await expect(loadProducts()).resolves.toHaveProperty('default')
    const { default: products } = await loadProducts()
    db.create.mockImplementation(async (_table: string, row: Record<string, unknown>) => ({
      data: { ...row, id: 'product-1' },
      affected: 1,
    }))
    const body = form('application/pdf', { title: 'Guide', price: '1200' })
    const result = await request(
      products,
      '/',
      { method: 'POST', body },
      async (response) => ({
        status: response.status,
        body: await response.json(),
      }),
      'admin',
    )
    expect(result.status).toBe(201)
    expect(result.body).toMatchObject({ title: 'Guide', price: 1200 })
    expect(result.body).not.toHaveProperty('storage_key')
    expect(files.get('stored-file')?.toString()).toBe('test file')
  })

  it('rejects an invalid price and an active file type without leaving blobs', async () => {
    const { default: products } = await loadProducts()
    db.create.mockImplementation(async (_table: string, row: Record<string, unknown>) => ({
      data: { ...row, id: 'product-1' },
      affected: 1,
    }))
    const pdf = form('application/pdf', { title: 'Guide', price: '12.5' })
    expect(await request(products, '/', { method: 'POST', body: pdf }, status, 'admin')).toBe(400)
    const svg = form('image/svg+xml', { title: 'Artwork', price: '1200' })
    expect(await request(products, '/', { method: 'POST', body: svg }, status, 'admin')).toBe(415)
    expect(files.size).toBe(0)
  })
})

describe('file-attachments example', () => {
  const attachment = {
    id: 'attachment-1',
    file_id: 'stored-file',
    parent_id: 'record-1',
    user_id: 'user-1',
    filename: 'document.pdf',
    mimetype: 'application/pdf',
  }

  it('serves an owned attachment with the shared download headers', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'attachments' ? attachment : { id: 'record-1', user_id: 'user-1' },
    )
    files.set('stored-file', Buffer.from('document bytes'))
    await request(attachments, '/attachment-1/download', {}, async (response) => {
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Security-Policy') ?? '').toContain('sandbox')
      expect(await response.text()).toBe('document bytes')
    })
  })

  it('denies a former parent owner access to the attachment and leaves the bytes in storage', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'attachments' ? attachment : { id: 'record-1', user_id: 'user-2' },
    )
    files.set('stored-file', Buffer.from('document bytes'))
    expect(await request(attachments, '/attachment-1/download', {}, status)).toBe(404)
    expect(await request(attachments, '/attachment-1', { method: 'DELETE' }, status)).toBe(404)
    expect(files.has('stored-file')).toBe(true)
  })

  it('keeps the bytes if deleting the attachment row fails', async () => {
    db.findById.mockImplementation(async (table: string) =>
      table === 'attachments' ? attachment : { id: 'record-1', user_id: 'user-1' },
    )
    db.deleteById.mockRejectedValue(new Error('delete failed'))
    files.set('stored-file', Buffer.from('document bytes'))
    expect(await request(attachments, '/attachment-1', { method: 'DELETE' }, status)).toBe(500)
    expect(files.has('stored-file')).toBe(true)
  })
})

describe('profile-photo-upload example', () => {
  it('preserves the file-only limit on the profile photo form', async () => {
    db.findById.mockResolvedValue({ avatar: null })
    db.updateById.mockResolvedValue({ data: {}, affected: 1 })
    const body = form('image/png', { note: 'unexpected field' })
    expect(await request(avatars, '/avatar', { method: 'POST', body }, status)).toBe(413)
    expect(files.size).toBe(0)
  })
})
