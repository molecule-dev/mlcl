import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import { Readable } from 'node:stream'

import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider as setImage } from '@molecule/api-image'
import { provider as sharp } from '@molecule/api-image-sharp'
import { setUploadParserFactory } from '@molecule/api-middleware-body-parser'
import { uploadParserFactory } from '@molecule/api-middleware-body-parser-express'
import { setProvider, type UploadedFile } from '@molecule/api-uploads'

import { photoFilesRouter, uploadsRouter } from '../handlers/uploads.js'

type Photo = {
  owner_id: string
  visibility: 'public' | 'private' | 'unlisted'
} & Partial<Record<'original_url' | 'large_url' | 'thumbnail_url', string>>

const photos: Photo[] = []
let currentUser: string | undefined
vi.mock('@molecule/api-bonds-default-express', () => ({ getUserId: () => currentUser }))
vi.mock('@molecule/api-database', () => ({
  findMany: async (
    _table: string,
    { where }: { where: Array<{ field: keyof Photo; value: string }> },
  ) => photos.filter((photo) => where.every(({ field, value }) => photo[field] === value)),
}))

const files = new Map<string, { bytes: Buffer; type: string }>()
setImage(sharp)
setUploadParserFactory(uploadParserFactory)
setProvider({
  upload(fieldname, stream, info) {
    const file: UploadedFile = {
      id: 'stored-key',
      fieldname,
      filename: info.filename ?? 'photo',
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      uploaded: false,
    }
    file.uploadPromise = (async () => {
      const chunks: Buffer[] = []
      for await (const chunk of stream) chunks.push(Buffer.from(chunk))
      const bytes = Buffer.concat(chunks)
      files.set(file.id, { bytes, type: file.mimetype })
      file.size = bytes.length
      file.uploaded = true
    })()
    return file
  },
  abortUpload() {},
  async deleteFile(id) {
    files.delete(id)
  },
  async getFile(id) {
    const file = files.get(id)
    return file ? Readable.from(file.bytes) : null
  },
})

async function withServer<T>(run: (base: string) => Promise<T>): Promise<T> {
  const app = express()
  app.use('/api/photo-uploads', uploadsRouter)
  app.use('/api/photo-files', photoFilesRouter)
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  try {
    const { port } = server.address() as AddressInfo
    return await run(`http://127.0.0.1:${port}`)
  } finally {
    server.close()
  }
}

async function postPhoto(type: string, bytes: Buffer | string, field = 'photo') {
  return withServer(async (base) => {
    const form = new FormData()
    form.append(
      field,
      new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], { type }),
      'x.png',
    )
    const res = await fetch(`${base}/api/photo-uploads`, { method: 'POST', body: form })
    return { status: res.status, body: await res.json() }
  })
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKZ0AAAAASUVORK5CYII=',
  'base64',
)
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'

beforeEach(() => {
  photos.length = 0
  files.clear()
  currentUser = 'user-1'
})

describe('photo files', () => {
  it('serves a public raster image inline based on its decoded bytes', async () => {
    files.set('key', { bytes: PNG, type: 'image/jpeg' })
    photos.push({ owner_id: 'user-1', original_url: '/api/photo-files/key', visibility: 'public' })
    currentUser = undefined
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/photo-files/key`)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('image/png')
      expect(res.headers.get('Content-Disposition')).toContain('inline')
      expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(res.headers.get('Content-Security-Policy') ?? '').toContain('sandbox')
      expect(Buffer.from(await res.arrayBuffer())).toEqual(PNG)
    })
  })

  it('refuses to serve a stored SVG even when its photo was published', async () => {
    files.set('key', { bytes: Buffer.from(SVG), type: 'image/png' })
    photos.push({ owner_id: 'user-1', original_url: '/api/photo-files/key', visibility: 'public' })
    await withServer(async (base) => {
      const res = await fetch(`${base}/api/photo-files/key`)
      expect(res.status).toBe(415)
      expect(res.headers.get('Content-Type')).toBeNull()
      expect(await res.text()).toBe('')
    })
  })

  it('serves private bytes only to the owner and rechecks visibility on each request', async () => {
    files.set('key', { bytes: PNG, type: 'image/png' })
    const photo: Photo = {
      owner_id: 'user-1',
      thumbnail_url: '/api/photo-files/key',
      visibility: 'public',
    }
    await withServer(async (base) => {
      const url = `${base}/api/photo-files/key`
      expect((await fetch(url)).status).toBe(404)
      photos.push(photo)
      currentUser = undefined
      const publicFile = await fetch(url)
      expect(publicFile.status).toBe(200)
      expect(publicFile.headers.get('Cache-Control')).toContain('no-store')
      await publicFile.arrayBuffer()
      photo.visibility = 'private'
      expect((await fetch(url)).status).toBe(404)
      currentUser = 'user-2'
      expect((await fetch(url)).status).toBe(404)
      currentUser = 'user-1'
      const own = await fetch(url)
      expect(own.status).toBe(200)
      expect(Buffer.from(await own.arrayBuffer())).toEqual(PNG)
    })
  })
})

describe('photo uploads', () => {
  it('does not store SVG bytes declared as image/png', async () => {
    expect((await postPhoto('image/png', SVG)).status).toBe(415)
    expect(files.size).toBe(0)
  })

  it('stores a raster image with its decoded content type', async () => {
    const result = await postPhoto('image/jpeg', PNG)
    expect(result.status).toBe(201)
    expect(result.body).toMatchObject({ mimeType: 'image/png', url: '/api/photo-files/stored-key' })
    expect(files.get('stored-key')).toEqual({ bytes: PNG, type: 'image/png' })
  })

  it('rejects a file in a different form field', async () => {
    expect((await postPhoto('image/png', PNG, 'file')).status).toBe(400)
    expect(files.size).toBe(0)
  })

  it('rejects a declared type outside the allowlist', async () => {
    expect((await postPhoto('text/html', 'non-image')).status).toBe(415)
    expect(files.size).toBe(0)
  })
})
