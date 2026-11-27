import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as uploads from '@molecule/api-uploads'

vi.mock('@molecule/api-uploads', async (importOriginal) => ({
  ...(await importOriginal<typeof uploads>()),
  getProvider: vi.fn(),
  hasProvider: vi.fn(() => true),
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))
vi.mock('@molecule/api-database', () => ({ create: vi.fn(), findById: vi.fn() }))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getParamId: (req: { params: { id: string } }) => req.params.id,
  getUserId: () => undefined,
}))

import { findById } from '@molecule/api-database'
import { getProvider as getUploads } from '@molecule/api-uploads'

import router from '../handlers/uploads.js'

const fileBytes = Buffer.from('stored image bytes')

async function getUpload<T>(id: string, consume: (res: Response) => Promise<T>): Promise<T> {
  const app = express()
  app.use('/api/uploads', router)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    return await consume(await fetch(`http://127.0.0.1:${port}/api/uploads/${id}`))
  } finally {
    server.close()
  }
}

describe('public listing photo responses', () => {
  beforeEach(() => {
    vi.mocked(findById).mockReset()
    vi.mocked(getUploads).mockReset()
    vi.mocked(getUploads).mockReturnValue({
      upload: vi.fn(),
      abortUpload: vi.fn(),
      deleteFile: vi.fn(),
      getFile: async () => Readable.from(fileBytes),
    })
  })

  it('streams the stored image inline with nosniff', async () => {
    vi.mocked(findById).mockResolvedValue({ id: 'up-1', file_id: 'f-1', mimetype: 'image/png' })
    await getUpload('up-1', async (res) => {
      expect(res.status).toBe(200)
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('Content-Type')).toBe('image/png')
      expect(res.headers.get('Content-Disposition')).toBe('inline')
      expect(Buffer.from(await res.arrayBuffer())).toEqual(fileBytes)
    })
  })

  it('serves a legacy active MIME type only as a sandboxed attachment', async () => {
    vi.mocked(findById).mockResolvedValue({ id: 'up-1', file_id: 'f-1', mimetype: 'text/html' })
    await getUpload('up-1', async (res) => {
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('application/octet-stream')
      expect(res.headers.get('Content-Disposition')).toBe('attachment')
      expect(res.headers.get('Content-Security-Policy') ?? '').toContain('sandbox')
      expect(Buffer.from(await res.arrayBuffer())).toEqual(fileBytes)
    })
  })

  it('refuses an unregistered provider key', async () => {
    vi.mocked(findById).mockResolvedValue(null)
    await getUpload('f-1', async (res) => {
      expect(res.status).toBe(404)
      await res.arrayBuffer()
    })
    expect(getUploads).not.toHaveBeenCalled()
  })
})
