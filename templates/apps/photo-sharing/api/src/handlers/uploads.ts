/**
 * Photo upload routes.
 *
 * - POST /api/photo-uploads — multipart/form-data with a single `photo`
 *   file field. Buffers the bytes (cap at 25 MB) so we can extract image
 *   metadata via the bonded image provider (sharp), then streams the
 *   buffer to S3 via the bonded uploads provider. Returns the storage
 *   key + URL the frontend should attach to a follow-up POST /api/photos.
 * - GET /api/photo-files/:id — proxies the stored file back from S3 via
 *   the uploads provider. Public (no auth) so <img src> loads work for
 *   unauthenticated viewers (landing, public profiles, etc).
 *
 * The /api/photo-uploads route is mounted in server.ts BEFORE the
 * shared body parser, because the shared body parser uses busboy with
 * `files: 0` and silently discards multipart file streams.
 *
 * @module
 */

import { Readable } from 'node:stream'

import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { getProvider as getImage } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { getProvider as getUploads } from '@molecule/api-uploads'

const MAX_FILE_BYTES = 25 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/tiff',
  'image/avif',
])

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
  return SAFE_IMAGE_CONTENT_TYPES[format.toLowerCase()] ?? null
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

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_FILE_BYTES, fields: 5 },
})

export const uploadsRouter = Router()
export const photoFilesRouter = Router()

uploadsRouter.post('/', busboyMiddleware, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized.' }) })
    return
  }

  if (!req.busboy) {
    res.status(400).json({
      error: t('uploads.error.notMultipart', {}, { defaultValue: 'Expected multipart/form-data.' }),
    })
    return
  }

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

  const buffered = await new Promise<{
    buffer: Buffer
    filename: string
    mimeType: string
    error?: { status: number; message: string }
  } | null>((resolve) => {
    let captured = false
    let errored = false
    let limitReached = false
    let filename = 'photo'
    let mimeType = 'application/octet-stream'
    const chunks: Buffer[] = []

    req.busboy.on(
      'file',
      (
        _field: string,
        stream: NodeJS.ReadableStream,
        info: { filename: string; encoding: string; mimeType: string },
      ) => {
        if (captured) {
          stream.resume()
          return
        }
        captured = true
        filename = info.filename || filename
        mimeType = info.mimeType || mimeType
        stream.on('data', (chunk: Buffer) => chunks.push(chunk))
        stream.on('limit', () => {
          limitReached = true
        })
        stream.on('end', () => {
          // Drained; finish handler will resolve.
        })
        stream.on('error', (err) => {
          if (errored) return
          errored = true
          logger.error('photo-uploads: stream error', err)
          resolve({
            buffer: Buffer.alloc(0),
            filename,
            mimeType,
            error: { status: 400, message: 'Could not read upload stream.' },
          })
        })
      },
    )

    req.busboy.on('finish', () => {
      if (errored) return
      if (limitReached) {
        resolve({
          buffer: Buffer.alloc(0),
          filename,
          mimeType,
          error: {
            status: 413,
            message: t(
              'uploads.error.tooLarge',
              { max: '25MB' },
              {
                defaultValue: 'File exceeds maximum allowed size (25MB).',
              },
            ),
          },
        })
        return
      }
      if (!captured) {
        resolve({
          buffer: Buffer.alloc(0),
          filename,
          mimeType,
          error: {
            status: 400,
            message: t(
              'uploads.error.noFile',
              {},
              {
                defaultValue: 'No file provided.',
              },
            ),
          },
        })
        return
      }
      resolve({ buffer: Buffer.concat(chunks), filename, mimeType })
    })

    req.busboy.on('error', (err: Error) => {
      if (errored) return
      errored = true
      logger.error('photo-uploads: busboy error', err)
      resolve(null)
    })

    req.on('aborted', () => {
      if (errored) return
      errored = true
      resolve(null)
    })

    req.pipe(req.busboy)
  })

  if (!buffered) {
    res.status(400).json({
      error: t('uploads.error.badRequest', {}, { defaultValue: 'Could not parse upload.' }),
    })
    return
  }
  if (buffered.error) {
    res.status(buffered.error.status).json({ error: buffered.error.message })
    return
  }

  const { buffer, filename, mimeType } = buffered
  if (buffer.length === 0) {
    res
      .status(400)
      .json({ error: t('uploads.error.emptyFile', {}, { defaultValue: 'Empty file.' }) })
    return
  }
  if (!ACCEPTED_TYPES.has(mimeType.toLowerCase())) {
    res.status(415).json({
      error: t(
        'uploads.error.badType',
        { type: mimeType },
        {
          defaultValue: `Unsupported image type: ${mimeType}`,
        },
      ),
    })
    return
  }

  let metadata: { width: number; height: number; format: string; size: number } | null
  let safeContentType: string
  try {
    const meta = await imageProvider.getMetadata(buffer)
    if (!meta.width || !meta.height) {
      res.status(415).json({
        error: t('uploads.error.notImage', {}, { defaultValue: 'File is not a recognised image.' }),
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
    url: `/api/photo-files/${file.id}`,
    storageKey: file.id,
    locationUrl: file.location ?? null,
    mimeType: safeContentType,
    size: buffer.length,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
    format: metadata?.format ?? null,
  })
})

photoFilesRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '')
  if (!id) {
    res.status(400).end()
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

  // ALWAYS send nosniff so the browser never sniffs the bytes to text/html
  // (the stored-XSS vector), plus the validated image Content-Type and an
  // inline disposition. nosniff + correct Content-Type is the decisive fix.
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Type', contentType)
  res.setHeader('Content-Disposition', `inline; filename="${id}"`)
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.send(buffer)
})

export default uploadsRouter
