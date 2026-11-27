/**
 * Photo upload routes.
 *
 * - POST /api/photo-uploads — multipart/form-data with a single `photo`
 *   file field. The shared upload parser holds the bytes in memory (cap at
 *   25 MB) so we can extract image metadata via the bonded image provider
 *   (sharp) and refuse a non-raster file before it is stored; then the
 *   buffer goes to the bonded uploads provider. Returns the storage key +
 *   URL the frontend should attach to a follow-up POST /api/photos.
 * - GET /api/photo-files/:id — proxies the stored file back from S3 via
 *   the uploads provider after checking the photo's visibility. Public and
 *   unlisted photos can render for guests.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'

import { type Request, type RequestHandler, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { getProvider as getImage } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import {
  createUploadParser,
  getParsedUploads,
  type StoredUpload,
  type UploadStorage,
} from '@molecule/api-middleware-body-parser'
import { getProvider as getUploads, isInlineUploadType, sendUpload } from '@molecule/api-uploads'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const PHOTO_FILES_PATH = '/api/photo-files/'
const PHOTO_URL_COLUMNS = ['original_url', 'large_url', 'thumbnail_url']
const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/avif',
]

/**
 * Allowlist of *byte-decoded* raster formats (as reported by the image
 * provider's `getMetadata`) that we are willing to store and serve.
 *
 * This is the real security boundary — NOT the client-declared mime type,
 * which is trivially spoofable (an SVG polyglot can claim `image/png`).
 * `svg`, `unknown`, and anything else not listed here are rejected. SVG in
 * particular is excluded because it is an active document format that can
 * carry inline `<script>` and execute in our origin if a browser ever
 * parses it as HTML/XML.
 *
 * Each allowed format maps to the single safe `image/*` Content-Type we
 * emit on serve, so the stored value is derived from the decoded bytes
 * rather than from anything the uploader supplied.
 */
const SAFE_IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  avif: 'image/avif',
}

/**
 * Maps a byte-decoded image format to a safe `image/*` Content-Type, or
 * `null` if the format is not an allowed raster type (e.g. `svg`,
 * `unknown`). The lookup is the single choke point for both the upload
 * gate and the serve route so they can never drift apart.
 */
function safeImageContentType(format: string | null | undefined): string | null {
  if (!format) return null
  const key = format.toLowerCase()
  return Object.hasOwn(SAFE_IMAGE_CONTENT_TYPES, key) ? SAFE_IMAGE_CONTENT_TYPES[key] : null
}

/**
 * Collects a readable stream into a single Buffer. Used on the serve path
 * so we can decode the stored bytes' real format and emit a validated
 * Content-Type instead of streaming bytes with no/guessable type.
 */
function collectStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/** A photo held in memory: its decoded format is checked before anything is stored. */
interface BufferedPhoto extends StoredUpload {
  buffer: Buffer
  filename: string
  mimeType: string
}

/** Rejects a buffered photo's pending read when the parser aborts the request. */
const abortPhoto = new WeakMap<BufferedPhoto, (error: Error) => void>()

/**
 * Upload storage that keeps the photo in memory (at most MAX_FILE_BYTES, which the
 * parser enforces), so the handler can decode it and refuse a non-raster file before
 * the bytes ever reach the uploads provider.
 */
const memoryStorage: UploadStorage<BufferedPhoto> = {
  upload(_fieldname, stream, info) {
    const chunks: Buffer[] = []
    const photo: BufferedPhoto = {
      id: randomUUID(),
      buffer: Buffer.alloc(0),
      filename: info.filename || 'photo',
      mimeType: info.mimeType,
    }
    photo.uploadPromise = new Promise<void>((resolve, reject) => {
      abortPhoto.set(photo, reject)
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => {
        photo.buffer = Buffer.concat(chunks)
        resolve()
      })
      stream.on('error', reject)
    })
    return photo
  },
  abortUpload(photo) {
    abortPhoto.get(photo)?.(new Error('Upload aborted.'))
  },
  // Nothing was stored: the buffer goes with the request.
  async deleteFile() {},
}

export const uploadsRouter = Router()
export const photoFilesRouter = Router()

const requireUser: RequestHandler = (_req, res, next) => {
  if (!getUserId(res)) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized.' }) })
    return
  }
  next()
}

// The shared upload parser refuses a declared type outside ACCEPTED_TYPES (415), a file
// over 25 MB (413), a missing photo (400) and a non-multipart body (415) before this runs.
uploadsRouter.post(
  '/',
  requireUser,
  createUploadParser({
    field: 'photo',
    maxFileBytes: MAX_FILE_BYTES,
    types: ACCEPTED_TYPES,
    maxFields: 5,
    storage: () => memoryStorage,
  }),
  async (req, res) => {
    let imageProvider: ReturnType<typeof getImage>
    let uploadsProvider: ReturnType<typeof getUploads>
    try {
      imageProvider = getImage()
      uploadsProvider = getUploads()
    } catch (err) {
      logger.error('photo-uploads: provider lookup failed', err)
      res.status(503).json({
        error: t(
          'uploads.error.providerUnavailable',
          {},
          {
            defaultValue: 'Upload provider unavailable.',
          },
        ),
      })
      return
    }

    const [photo] = getParsedUploads<BufferedPhoto>(req, 'photo')
    const { buffer, filename } = photo
    if (buffer.length === 0) {
      res
        .status(400)
        .json({ error: t('uploads.error.emptyFile', {}, { defaultValue: 'Empty file.' }) })
      return
    }

    let metadata: { width: number; height: number; format: string; size: number } | null
    let safeContentType: string
    try {
      const meta = await imageProvider.getMetadata(buffer)
      if (!meta.width || !meta.height) {
        res.status(415).json({
          error: t(
            'uploads.error.notImage',
            {},
            { defaultValue: 'File is not a recognised image.' },
          ),
        })
        return
      }
      // Security boundary: trust the DECODED bytes, not the client-declared
      // mime type. Reject `svg`, `unknown`, and any non-raster format — an
      // SVG polyglot can pass `getMetadata` (returns width/height) yet carry
      // executable markup. The served Content-Type is derived from here.
      const derived = safeImageContentType(meta.format)
      if (!derived) {
        res.status(415).json({
          error: t(
            'uploads.error.badType',
            { type: meta.format },
            {
              defaultValue: `Unsupported image type: ${meta.format}`,
            },
          ),
        })
        return
      }
      safeContentType = derived
      metadata = { width: meta.width, height: meta.height, format: meta.format, size: meta.size }
    } catch (err) {
      logger.error('photo-uploads: image metadata failed', err)
      res.status(415).json({
        error: t('uploads.error.notImage', {}, { defaultValue: 'File is not a recognised image.' }),
      })
      return
    }

    let streamErr: Error | null = null
    const file = uploadsProvider.upload(
      'photo',
      Readable.from(buffer),
      // Persist the byte-validated Content-Type, never the client-declared
      // `mimeType`, so the stored object carries a safe `image/*` type.
      { filename, encoding: 'binary', mimeType: safeContentType },
      (err) => {
        streamErr = err
      },
    )

    if (file.uploadPromise) {
      try {
        await file.uploadPromise
      } catch (err) {
        streamErr = err instanceof Error ? err : new Error(String(err))
      }
    }

    if (streamErr || !file.uploaded) {
      logger.error('photo-uploads: storage upload failed', streamErr)
      res.status(502).json({
        error: t(
          'uploads.error.s3Failed',
          { message: streamErr?.message ?? 'unknown' },
          {
            defaultValue: `Upload to storage failed: ${streamErr?.message ?? 'unknown error'}`,
          },
        ),
      })
      return
    }

    res.status(201).json({
      id: file.id,
      filename,
      url: `${PHOTO_FILES_PATH}${file.id}`,
      storageKey: file.id,
      locationUrl: file.location ?? null,
      mimeType: safeContentType,
      size: buffer.length,
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      format: metadata?.format ?? null,
    })
  },
)

photoFilesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '')
  if (!id) {
    res.status(400).end()
    return
  }
  const userId = getUserId(res)
  const references = await Promise.all(
    PHOTO_URL_COLUMNS.map((field) =>
      findMany<{ owner_id: string; visibility: string }>('photos', {
        where: [{ field, operator: '=', value: `${PHOTO_FILES_PATH}${id}` }],
        select: ['owner_id', 'visibility'],
      }),
    ),
  )
  const photos = references.flat()
  if (
    photos.length === 0 ||
    photos.some((photo) => photo.visibility === 'private' && photo.owner_id !== userId)
  ) {
    res.status(404).end()
    return
  }
  let provider: ReturnType<typeof getUploads>
  let imageProvider: ReturnType<typeof getImage>
  try {
    provider = getUploads()
    imageProvider = getImage()
  } catch (err) {
    logger.error('photo-files: provider lookup failed', err)
    res.status(503).end()
    return
  }
  if (!provider.getFile) {
    res.status(503).end()
    return
  }
  let stream: NodeJS.ReadableStream | null
  try {
    stream = await provider.getFile(id)
  } catch (err) {
    logger.error('photo-files: get failed', { id, err })
    res.status(404).end()
    return
  }
  if (!stream) {
    res.status(404).end()
    return
  }

  // Buffer the stored bytes so we can decode their real format and emit a
  // validated Content-Type. The core `UploadProvider.getFile` returns only
  // a stream (no stored Content-Type), so we re-derive it from the bytes.
  let buffer: Buffer
  try {
    buffer = await collectStream(stream)
  } catch (err) {
    logger.error('photo-files: read failed', { id, err })
    res.status(404).end()
    return
  }

  // Decide the Content-Type from the DECODED format, never by sniffing.
  let contentType: string | null
  try {
    const meta = await imageProvider.getMetadata(buffer)
    contentType = safeImageContentType(meta.format)
  } catch (err) {
    logger.error('photo-files: metadata failed', { id, err })
    contentType = null
  }
  // Refuse to serve anything that is not a known-safe raster image (e.g. an
  // SVG polyglot that slipped in before the upload gate was hardened).
  if (!contentType) {
    res.status(415).end()
    return
  }

  // A photo can become private after this request. Recheck visibility on the next read.
  res.setHeader('Cache-Control', 'private, no-store')
  if (isInlineUploadType(contentType)) {
    await sendUpload(res, Readable.from(buffer), {
      type: contentType,
      inline: true,
      size: buffer.length,
    })
    return
  }
  // TIFF and HEIF retain their byte-validated inline types for browsers that support them.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', 'inline')
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'")
  res.send(buffer)
})

export default uploadsRouter
