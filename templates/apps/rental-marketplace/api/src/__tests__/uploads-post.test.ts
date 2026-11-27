import { once } from 'node:events'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// POST /api/uploads runs after the app-wide body parser, which leaves multipart bodies for the
// route: the shared upload parser stores the photo, the handler records an owned row, and a
// failed row write frees the stored photo.

const create = vi.fn()
vi.mock('@molecule/api-database', () => ({
  create: (...a: unknown[]) => create(...a),
  findById: vi.fn(),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: () => 'up-1',
  getUserId: () => 'host-1',
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

import {
  bodyParser,
  setBodyParser,
  setUploadParserFactory,
} from '@molecule/api-middleware-body-parser'
import {
  provider as expressBodyParser,
  uploadParserFactory,
} from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import router from '../handlers/uploads.js'

const stored = new Set<string>()
const deleteFile = vi.fn(async (id: string) => {
  stored.delete(id)
})
setBodyParser(expressBodyParser)
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const file: UploadedFile = {
      id: 'photo-1',
      fieldname,
      filename: info.filename ?? 'photo',
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      uploaded: false,
    }
    file.uploadPromise = new Promise<void>((resolve) => {
      stream.on('data', (chunk: Buffer) => {
        file.size += chunk.length
      })
      stream.on('end', () => {
        stored.add(file.id)
        file.uploaded = true
        resolve()
      })
    })
    return file
  },
  abortUpload: vi.fn(),
  deleteFile,
})

async function post(type: string, extra?: 'field' | 'file') {
  const app = express()
  app.use(bodyParser)
  app.use('/api/uploads', router)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const form = new FormData()
    if (extra === 'field') form.append('note', 'unexpected field')
    form.append('file', new Blob([new Uint8Array(8)], { type }), 'front.png')
    if (extra === 'file') {
      form.append('file', new Blob([new Uint8Array(8)], { type }), 'back.png')
    }
    const { port } = server.address() as AddressInfo
    const res = await fetch(`http://127.0.0.1:${port}/api/uploads`, { method: 'POST', body: form })
    return { status: res.status, body: (await res.json()) as Record<string, unknown> }
  } finally {
    server.close()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  stored.clear()
  create.mockResolvedValue({ data: { id: 'up-1' } })
})

describe('POST /api/uploads behind the app-wide body parser', () => {
  it('stores the photo and returns its serve URL', async () => {
    const res = await post('image/png')
    expect(res).toEqual({ status: 201, body: { id: 'up-1', url: '/api/uploads/up-1' } })
    expect(create).toHaveBeenCalledWith(
      'uploads',
      expect.objectContaining({ user_id: 'host-1', file_id: 'photo-1', size: 8 }),
    )
    expect(stored.has('photo-1')).toBe(true)
  })

  it('frees the stored photo when its row cannot be written', async () => {
    create.mockRejectedValueOnce(new Error('db down'))
    const res = await post('image/png')
    expect(res.status).toBe(500)
    expect(deleteFile).toHaveBeenCalledWith('photo-1')
    expect(stored.size).toBe(0)
  })

  it('refuses a non-image before storing anything', async () => {
    const res = await post('text/html')
    expect(res.status).toBe(415)
    expect(stored.size).toBe(0)
  })

  it('refuses unexpected multipart fields before recording a photo', async () => {
    const res = await post('image/png', 'field')
    expect(res.status).toBe(413)
    expect(stored.size).toBe(0)
    expect(create).not.toHaveBeenCalled()
  })

  it('discards the first file if a second file makes the request invalid', async () => {
    const res = await post('image/png', 'file')
    expect(res.status).toBe(413)
    expect(stored.size).toBe(0)
    expect(create).not.toHaveBeenCalled()
  })
})
