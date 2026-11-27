import { once } from 'node:events'
import type { AddressInfo } from 'node:net'

import express, { type Router } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type * as defaultExpress from '@molecule/api-bonds-default-express'
import type * as database from '@molecule/api-database'

import type * as userResource from '../App/Resource/User/index.js'

const db = { findById: vi.fn(), updateById: vi.fn(), updateMany: vi.fn(), findMany: vi.fn() }
vi.mock('@molecule/api-database', async (importOriginal) => ({
  ...(await importOriginal<typeof database>()),
  findById: (...args: unknown[]) => db.findById(...args),
  updateById: (...args: unknown[]) => db.updateById(...args),
  updateMany: (...args: unknown[]) => db.updateMany(...args),
  findMany: (...args: unknown[]) => db.findMany(...args),
}))
vi.mock('@molecule/api-bonds-default-express', async (importOriginal) => ({
  ...(await importOriginal<typeof defaultExpress>()),
  getUserId: () => 'user-1',
}))
vi.mock('../App/Resource/User/index.js', async (importOriginal) => {
  const user = await importOriginal<typeof userResource>()
  return {
    ...user,
    requestHandlerMap: {
      ...user.requestHandlerMap,
      authSelf: (_req: unknown, _res: unknown, next: () => void) => next(),
      update: (_req: unknown, res: express.Response) => res.status(204).end(),
      resetPassword: (_req: unknown, res: express.Response) => res.status(204).end(),
    },
  }
})

import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import { router as appRouter } from '../App/router.js'
import avatars from '../handlers/avatar.js'
import templateHandlers from '../handlers/index.js'

const stored = new Set<string>()
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const file: UploadedFile = {
      id: 'newkey',
      fieldname,
      filename: info.filename ?? '',
      mimetype: info.mimeType,
      encoding: info.encoding,
      size: 0,
      uploaded: false,
    }
    file.uploadPromise = new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        file.size += chunk.length
      })
      stream.on('error', reject)
      stream.on('end', () => {
        stored.add(file.id)
        file.uploaded = true
        resolve()
      })
    })
    return file
  },
  abortUpload: () => {},
  async deleteFile(id) {
    stored.delete(id)
  },
})

async function request(path: string, init: RequestInit, router: Router = avatars) {
  const app = express()
  app.use(express.json())
  app.use(router)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    const response = await fetch(`http://127.0.0.1:${port}${path}`, init)
    const body = response.headers.get('content-type')?.includes('application/json')
      ? await response.json()
      : await response.text()
    return { status: response.status, body }
  } finally {
    server.close()
  }
}

function upload(options: { type?: string; extraField?: boolean } = {}) {
  const body = new FormData()
  if (options.extraField) body.append('note', 'unexpected text field')
  body.append('avatar', new Blob(['image bytes'], { type: options.type ?? 'image/png' }), 'a.png')
  return request('/avatar', { method: 'POST', body })
}

beforeEach(() => {
  vi.resetAllMocks()
  stored.clear()
  db.findById.mockResolvedValue({ avatar: null })
  db.updateById.mockResolvedValue({ data: {}, affected: 1 })
  db.updateMany.mockResolvedValue({ data: {}, affected: 1 })
  db.findMany.mockResolvedValue([])
})

describe('avatar storage after a profile write', () => {
  it('replaces the avatar and deletes the old blob after the swap', async () => {
    stored.add('oldkey')
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    const res = await upload()
    expect(res).toEqual({ status: 200, body: { url: '/api/user/avatar/newkey' } })
    expect(db.updateMany).toHaveBeenCalledWith(
      'users',
      [
        { field: 'id', operator: '=', value: 'user-1' },
        { field: 'avatar', operator: '=', value: '/api/user/avatar/oldkey' },
      ],
      { avatar: '/api/user/avatar/newkey' },
    )
    expect(stored).toEqual(new Set(['newkey']))
  })

  it('keeps an old blob still referenced by another profile', async () => {
    stored.add('oldkey')
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    db.findMany.mockResolvedValue([{ avatar: '/api/user/avatar/oldkey' }])
    expect((await upload()).status).toBe(200)
    expect(stored).toEqual(new Set(['oldkey', 'newkey']))
  })

  it('stores the first avatar', async () => {
    expect((await upload()).body).toEqual({ url: '/api/user/avatar/newkey' })
    expect(stored).toEqual(new Set(['newkey']))
  })

  it('frees the new blob when saving the profile fails', async () => {
    stored.add('oldkey')
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    db.updateMany.mockRejectedValueOnce(new Error('database down'))
    db.updateById.mockRejectedValueOnce(new Error('database down'))
    expect((await upload()).status).toBe(500)
    expect(stored).toEqual(new Set(['oldkey']))
  })

  it('frees the new blob when the expected profile row changed before the update', async () => {
    db.updateMany.mockResolvedValueOnce({ affected: 0 })
    db.updateById.mockResolvedValueOnce({ affected: 0 })
    expect((await upload()).status).toBe(500)
    expect(stored.size).toBe(0)
  })

  it('rejects SVG and unexpected text fields without storing an avatar', async () => {
    expect((await upload({ type: 'image/svg+xml' })).status).toBe(415)
    expect((await upload({ extraField: true })).status).toBe(413)
    expect(stored.size).toBe(0)
  })

  it('clears the profile reference and deletes the blob', async () => {
    stored.add('oldkey')
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    expect((await request('/avatar', { method: 'DELETE' })).status).toBe(204)
    expect(db.updateMany).toHaveBeenCalledWith('users', expect.any(Array), { avatar: null })
    expect(stored.size).toBe(0)
  })

  it('keeps the blob if clearing the profile reference fails', async () => {
    stored.add('oldkey')
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    db.updateMany.mockRejectedValueOnce(new Error('database down'))
    db.updateById.mockRejectedValueOnce(new Error('database down'))
    expect((await request('/avatar', { method: 'DELETE' })).status).toBe(500)
    expect(stored).toEqual(new Set(['oldkey']))
  })
})

describe('3D model viewer app router', () => {
  it('reserves managed avatar references for uploads and accepts external profile avatars', async () => {
    const patch = (avatar: string) =>
      request(
        '/users/user-1',
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ avatar }),
        },
        appRouter,
      )
    expect((await patch('/api/user/avatar/another-avatar')).status).toBe(400)
    expect((await patch('https://example.com/avatar.png')).status).toBe(204)
  })

  it('serves password resets only through the default user routes', async () => {
    const post = { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }
    expect((await request('/users/reset-password', post, appRouter)).status).toBe(204)
    expect((await request('/users/reset-password', post, templateHandlers)).status).toBe(404)
  })
})
