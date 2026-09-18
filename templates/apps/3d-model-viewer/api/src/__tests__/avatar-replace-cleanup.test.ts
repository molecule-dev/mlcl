import { Readable } from 'node:stream'

import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Replacing an avatar (POST /avatar when one already exists) must delete the PREVIOUS blob —
// otherwise every avatar change leaks the old object. The delete path already cleans up; this
// closes the same gap on the replace path. Both share the avatarFileId extractor.

const db = { findById: vi.fn(), updateById: vi.fn(), findMany: vi.fn() }
vi.mock('@molecule/api-database', () => ({
  findById: (...a: unknown[]) => db.findById(...a),
  updateById: (...a: unknown[]) => db.updateById(...a),
  findMany: (...a: unknown[]) => db.findMany(...a),
}))
const upload = vi.fn()
const deleteFile = vi.fn()
vi.mock('@molecule/api-uploads', () => ({
  getProvider: () => ({ upload, deleteFile, getFile: vi.fn() }),
}))
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => 'user-1' }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_k: string, _v?: unknown, o?: { defaultValue?: string }) => o?.defaultValue ?? _k,
}))

import router from '../handlers/avatar.js'

function findRoute(method: 'post' | 'delete') {
  const layer = (
    router.stack as Array<{
      route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> }
    }>
  ).find((l) => l.route?.path === '/avatar' && l.route.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} /avatar not found`)
  return layer.route.stack
}
function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    status(c: number) {
      this.statusCode = c
      return this
    },
    json(o: unknown) {
      this.body = o
      this.ended = true
      return this
    },
    end() {
      this.ended = true
      return this
    },
    setHeader() {
      return this
    },
    get headersSent() {
      return this.ended
    },
  }
  return res
}
function multipartReq() {
  const boundary = '----molavatarboundary'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="avatar"; filename="a.png"\r\n` +
        `Content-Type: image/png\r\n\r\n`,
    ),
    Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const req = Readable.from(body) as Readable & { method: string; headers: Record<string, string> }
  req.method = 'POST'
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  }
  return req
}
async function settle(res: { ended: boolean }) {
  for (let i = 0; i < 300 && !res.ended; i++) await new Promise((r) => setTimeout(r, 5))
}
async function runUpload() {
  const stack = findRoute('post')
  const middleware = stack[0].handle as (req: unknown, res: unknown, next: () => void) => void
  const handler = stack[1].handle as (req: unknown, res: unknown) => void
  const req = multipartReq()
  const res = mockRes()
  await new Promise<void>((resolve) => middleware(req, res, () => resolve()))
  handler(req, res)
  await settle(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  db.updateById.mockResolvedValue({ data: {} })
  deleteFile.mockResolvedValue(undefined)
  upload.mockImplementation((_field: string, stream: NodeJS.ReadableStream) => {
    stream.resume() // drain so busboy 'finish' fires
    return { id: 'newkey', uploadPromise: Promise.resolve() }
  })
})

describe('avatar replace frees the previous blob', () => {
  it('deletes the old avatar object when replacing an existing avatar', async () => {
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/oldkey' })
    const res = await runUpload()
    expect(res.body).toEqual({ url: '/api/user/avatar/newkey' })
    expect(db.updateById).toHaveBeenCalledWith('users', 'user-1', {
      avatar: '/api/user/avatar/newkey',
    })
    expect(deleteFile).toHaveBeenCalledWith('oldkey')
  })

  it('does not delete anything on a first-time avatar (no previous)', async () => {
    db.findById.mockResolvedValue({ avatar: null })
    const res = await runUpload()
    expect(res.body).toEqual({ url: '/api/user/avatar/newkey' })
    expect(deleteFile).not.toHaveBeenCalled()
  })

  it('DELETE /avatar removes the blob and clears the column', async () => {
    db.findById.mockResolvedValue({ avatar: '/api/user/avatar/k' })
    const handler = findRoute('delete')[0].handle as (req: Request, res: Response) => Promise<void>
    const res = mockRes()
    await handler({} as unknown as Request, res as unknown as Response)
    expect(deleteFile).toHaveBeenCalledWith('k')
    expect(db.updateById).toHaveBeenCalledWith('users', 'user-1', { avatar: null })
    expect(res.statusCode).toBe(204)
  })
})
