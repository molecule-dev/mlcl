import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider } from '@molecule/api-uploads'

import photos from '../handlers/photos.js'

let userId: string | undefined
const findMany = vi.fn()
const getFile = vi.fn()
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => userId }))
vi.mock('@molecule/api-database', () => ({ findMany: (...args: unknown[]) => findMany(...args) }))

setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    stream.resume()
    return {
      id: 'photo-1',
      fieldname,
      filename: info.filename ?? 'photo',
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 11,
      uploaded: true,
      uploadPromise: once(stream, 'end').then(() => undefined),
    }
  },
  abortUpload: vi.fn(),
  deleteFile: vi.fn(),
  getFile,
})

async function request<T>(
  path: string,
  init: RequestInit,
  consume: (res: Response) => Promise<T>,
): Promise<T> {
  const app = express()
  app.use('/api/issues/photo', photos)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    return await consume(await fetch(`http://127.0.0.1:${port}/api/issues/photo${path}`, init))
  } finally {
    server.close()
  }
}

const status = async (res: Response): Promise<number> => {
  await res.arrayBuffer()
  return res.status
}

beforeEach(() => {
  vi.resetAllMocks()
  userId = 'resident'
  findMany.mockResolvedValue([])
})

describe('issue photos', () => {
  it('rejects form fields on its file-only upload', async () => {
    const body = new FormData()
    body.append('note', 'unexpected field')
    body.append('photo', new Blob(['image bytes'], { type: 'image/jpeg' }), 'photo.jpg')
    expect(await request('', { method: 'POST', body }, status)).toBe(413)
  })

  it('serves registered photos to residents with sandboxed inline headers', async () => {
    findMany.mockResolvedValue([{ id: 'issue-1' }])
    getFile.mockResolvedValue(Readable.from('photo bytes'))
    await request('/registered', {}, async (res) => {
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Disposition')).toBe('inline')
      expect(res.headers.get('Content-Security-Policy') ?? '').toContain('sandbox')
      expect(await res.text()).toBe('photo bytes')
    })
  })

  it('refuses unregistered photos and requests without a session', async () => {
    expect(await request('/unregistered', {}, status)).toBe(404)
    userId = undefined
    expect(await request('/registered', {}, status)).toBe(401)
    expect(getFile).not.toHaveBeenCalled()
  })
})
