/**
 * Document upload + AI processing handler.
 *
 * Mounted BEFORE the body-parser in `server.ts` so the multipart body
 * survives untouched. The handler:
 *
 *   1. Streams the incoming file to S3 via the bonded uploads provider
 *      and *also* buffers it in memory (size-capped) so we can hand the
 *      bytes to the AI provider for OCR + classification + extraction.
 *   2. Calls Anthropic's `chat` (non-streaming, single tool_use) with a
 *      strict JSON tool definition. Whatever Claude returns goes into
 *      `documents`, `document_fields`, and `document_events`.
 *   3. Replies with the persisted document row in the shape the
 *      front-end pages (`Documents`, `DocumentDetail`, dashboard
 *      `recent`) consume — see `serializeDocument()` in
 *      `./documents.ts`.
 *
 * Authentication: `verifyMiddleware()` runs ahead of this in
 * `server.ts`. We re-check `res.locals.session.userId` defensively
 * and 401 if missing.
 *
 * @module
 */
import connectBusboy from 'connect-busboy'
import { type Request, type Response, Router } from 'express'
import { Readable } from 'stream'

import type { AIProvider, ChatEvent } from '@molecule/api-ai'
import {
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { getProvider as getUploadProvider } from '@molecule/api-uploads'

import { serializeDocument } from './documents.js'

const router = Router()

const MAX_FILE_BYTES = 25 * 1024 * 1024

const busboyMiddleware = connectBusboy({
  limits: { files: 1, fileSize: MAX_FILE_BYTES, fields: 5 },
})

const ALLOWED_CLASSES = [
  'invoice',
  'receipt',
  'contract',
  'form',
  'report',
  'identification',
  'letter',
  'other',
] as const

type DocClass = (typeof ALLOWED_CLASSES)[number]

interface AIResult {
  document_type: DocClass
  classification_confidence: number
  classification_reasoning: string
  detected_language: string | null
  page_count: number | null
  summary: string
  suggested_filing_path: string | null
  fields: Array<{
    field_name: string
    field_value: string
    confidence: number
    field_group?: string | null
  }>
}

const TOOL_NAME = 'record_document_extraction'

const buildContentBlock = (
  mimetype: string,
  buf: Buffer,
): { type: 'text' | 'document' | 'image'; mediaType?: string; data?: string; text?: string } => {
  const mt = (mimetype || '').toLowerCase()
  if (mt === 'application/pdf') {
    return { type: 'document', mediaType: 'application/pdf', data: buf.toString('base64') }
  }
  if (mt.startsWith('image/')) {
    const subtype = mt.split('/')[1] || 'png'
    return { type: 'image', mediaType: `image/${subtype}`, data: buf.toString('base64') }
  }
  // Everything else (csv, txt, json, …) — send as raw text so Claude can still classify.
  // Truncate to keep token usage bounded.
  const text = buf.toString('utf8').slice(0, 32_000)
  return { type: 'text', text }
}

const clamp01 = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

const resolveAIProvider = (): AIProvider | null =>
  getAIProviderByName('anthropic') ?? getAIProvider() ?? null

const askAIToProcess = async (
  filename: string,
  mimetype: string,
  buf: Buffer,
  signal: AbortSignal,
): Promise<AIResult> => {
  const provider = resolveAIProvider()
  if (!provider) {
    throw new Error(
      t('ai.error.noProvider', undefined, {
        defaultValue: 'AI provider not configured. Bond an AI provider first.',
      }),
    )
  }
  const block = buildContentBlock(mimetype, buf)

  const userTextOnly =
    block.type === 'text' ? `Filename: ${filename}\nMIME: ${mimetype}\n\n${block.text ?? ''}` : ''

  const events: ChatEvent[] = []
  const stream = provider.chat({
    stream: false,
    maxTokens: 2048,
    temperature: 0,
    system: `You are an expert document-processing engine. For each uploaded file, you must call the "${TOOL_NAME}" tool exactly once with a complete, accurate result. Always populate every required field. Be honest about confidence (0–1). Pick exactly one of: invoice, receipt, contract, form, report, identification, letter, other. Extract every meaningful field name/value pair you can read on the document. Suggest a filing path like "Vendors/Acme Corp/2026" or "Personal/IDs" — short, hierarchical, no leading slash.`,
    tools: [
      {
        name: TOOL_NAME,
        description:
          'Record the classification, summary, and structured field extraction for a single uploaded document.',
        parameters: {
          type: 'object',
          required: [
            'document_type',
            'classification_confidence',
            'classification_reasoning',
            'summary',
            'fields',
          ],
          properties: {
            document_type: {
              type: 'string',
              enum: [...ALLOWED_CLASSES],
              description: 'Best-fit class from the allowed list.',
            },
            classification_confidence: {
              type: 'number',
              description: 'Confidence in the chosen document_type, 0..1.',
            },
            classification_reasoning: {
              type: 'string',
              description: '1–3 sentences explaining why this class was chosen.',
            },
            detected_language: {
              type: 'string',
              description: 'ISO-639-1 language code, e.g. "en". Empty string if unknown.',
            },
            page_count: { type: 'integer', description: 'Pages in the document; 0 if unknown.' },
            summary: {
              type: 'string',
              description: '2–4 sentence executive summary in the document\u2019s language.',
            },
            suggested_filing_path: {
              type: 'string',
              description:
                'Hierarchical filing path, e.g. "Vendors/Acme/2026". Empty string if no good guess.',
            },
            fields: {
              type: 'array',
              description: 'Every meaningful key/value pair you extracted from the document.',
              items: {
                type: 'object',
                required: ['field_name', 'field_value', 'confidence'],
                properties: {
                  field_name: { type: 'string' },
                  field_value: { type: 'string' },
                  confidence: {
                    type: 'number',
                    description: '0..1 confidence for this specific field.',
                  },
                  field_group: {
                    type: 'string',
                    description:
                      'UI grouping bucket like "Vendor", "Totals", or "Dates". Empty string if no obvious group.',
                  },
                },
              },
            },
          },
        },
        execute: async () => null,
      },
    ],
    messages: [
      {
        role: 'user',
        content:
          block.type === 'text'
            ? userTextOnly
            : [
                {
                  type: 'text',
                  text: `Filename: ${filename}\nMIME: ${mimetype}\nProcess this document end-to-end via the ${TOOL_NAME} tool.`,
                },
                block as { type: 'document' | 'image'; mediaType: string; data: string },
              ],
      },
    ],
    signal,
  })

  for await (const ev of stream) {
    events.push(ev)
    if (ev.type === 'error') {
      throw new Error(`AI provider error: ${ev.message}`)
    }
  }

  const tool = events.find((e) => e.type === 'tool_use' && e.name === TOOL_NAME) as
    { type: 'tool_use'; name: string; input: unknown } | undefined
  if (!tool) {
    throw new Error('AI did not invoke the document-extraction tool.')
  }
  const input = tool.input as Partial<AIResult>

  const docClass = (ALLOWED_CLASSES as readonly string[]).includes(String(input.document_type))
    ? (input.document_type as DocClass)
    : 'other'

  const emptyToNull = (v: unknown): string | null => {
    const s = typeof v === 'string' ? v.trim() : null
    return s ? s : null
  }
  const positiveOrNull = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
  }

  return {
    document_type: docClass,
    classification_confidence: clamp01(Number(input.classification_confidence ?? 0)),
    classification_reasoning: String(input.classification_reasoning ?? '').trim(),
    detected_language: emptyToNull(input.detected_language),
    page_count: positiveOrNull(input.page_count),
    summary: String(input.summary ?? '').trim(),
    suggested_filing_path: emptyToNull(input.suggested_filing_path),
    fields: Array.isArray(input.fields)
      ? input.fields.slice(0, 100).map((f) => ({
          field_name: String(f.field_name ?? '').slice(0, 200),
          field_value: String(f.field_value ?? '').slice(0, 4000),
          confidence: clamp01(Number(f.confidence ?? 0)),
          field_group: emptyToNull(f.field_group),
        }))
      : [],
  }
}

router.post('/', busboyMiddleware, (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  if (!req.busboy) {
    res.status(400).json({
      error: t('uploads.error.notMultipart', undefined, {
        defaultValue: 'Expected multipart/form-data.',
      }),
    })
    return
  }

  let uploadProvider: ReturnType<typeof getUploadProvider>
  try {
    uploadProvider = getUploadProvider()
  } catch (err) {
    logger.error('upload.handler: provider lookup failed', err)
    res.status(500).json({
      error: t('uploads.error.noProvider', undefined, {
        defaultValue: 'Upload provider not configured.',
      }),
    })
    return
  }

  let responded = false
  let limitHit = false

  const fail = (status: number, error: Error | string): void => {
    if (responded) return
    responded = true
    const message = typeof error === 'string' ? error : error.message
    logger.error(`upload.handler: ${message}`)
    if (!res.headersSent) res.status(status).json({ error: message })
  }

  req.busboy.on(
    'file',
    (
      _field: string,
      stream: NodeJS.ReadableStream,
      info: { filename: string; encoding: string; mimeType: string },
    ) => {
      if (responded) {
        stream.resume()
        return
      }

      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => {
        if (limitHit) return
        chunks.push(chunk)
      })
      stream.on('limit', () => {
        limitHit = true
      })

      stream.on('end', async () => {
        if (responded) return
        if (limitHit) {
          fail(
            413,
            t('uploads.error.tooLarge', undefined, {
              defaultValue: 'File exceeds maximum allowed size.',
            }),
          )
          return
        }

        const buf = Buffer.concat(chunks)
        const filename = info.filename || 'document'
        const mimetype = info.mimeType || 'application/octet-stream'

        const replay = Readable.from(buf)
        const upload = uploadProvider.upload(
          'file',
          replay,
          { filename, encoding: info.encoding ?? '7bit', mimeType: mimetype },
          (err) => fail(500, err),
        )

        try {
          await Promise.resolve(upload.uploadPromise)
        } catch (err) {
          fail(500, err instanceof Error ? err : new Error(String(err)))
          return
        }

        // Persist a "uploaded → ocring" row before AI runs so the
        // document still exists if the AI call later fails. Matches a
        // production queue → background worker shape.
        const initialResult = await create('documents', {
          user_id: userId,
          title: filename,
          original_name: filename,
          source_type: 'upload',
          mime: mimetype,
          size_bytes: buf.byteLength,
          s3_key: upload.id,
          doc_class: null,
          status: 'ocring',
          language: null,
          page_count: null,
          tags_json: JSON.stringify([]),
          folder_id: null,
          uploaded_at: new Date(),
          created_at: new Date(),
        })
        const initialDoc =
          (initialResult as { data?: Record<string, unknown> }).data ?? initialResult
        const documentId = (initialDoc as { id?: string }).id
        if (!documentId) {
          fail(500, 'Failed to persist document row.')
          return
        }

        await create('document_events', {
          document_id: documentId,
          user_id: userId,
          kind: 'uploaded',
          detail_json: JSON.stringify({ filename, mimetype, size_bytes: buf.byteLength }),
          created_at: new Date(),
        })

        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 5 * 60 * 1000)

        try {
          const ai = await askAIToProcess(filename, mimetype, buf, ctrl.signal)
          clearTimeout(timer)

          await updateById('documents', documentId, {
            doc_class: ai.document_type,
            status: 'ready',
            summary_md: ai.summary,
            language: ai.detected_language,
            page_count: ai.page_count,
            classification_confidence: ai.classification_confidence,
            classification_reasoning: ai.classification_reasoning,
            suggested_filing_path: ai.suggested_filing_path,
            processed_at: new Date(),
          })

          for (const f of ai.fields) {
            await create('document_fields', {
              document_id: documentId,
              user_id: userId,
              key: f.field_name,
              value: f.field_value,
              confidence: f.confidence,
              field_group: f.field_group ?? 'Other',
              source: 'extraction',
              reviewed: false,
              corrected_value: null,
              created_at: new Date(),
            })
          }

          await create('document_events', {
            document_id: documentId,
            user_id: userId,
            kind: 'classified',
            detail_json: JSON.stringify({
              document_type: ai.document_type,
              classification_confidence: ai.classification_confidence,
              field_count: ai.fields.length,
            }),
            created_at: new Date(),
          })
          await create('document_events', {
            document_id: documentId,
            user_id: userId,
            kind: 'ready',
            detail_json: JSON.stringify({ summary_chars: ai.summary.length }),
            created_at: new Date(),
          })
        } catch (err) {
          clearTimeout(timer)
          const errMsg = err instanceof Error ? err.message : String(err)
          logger.error('upload.handler: AI processing failed', errMsg)
          await updateById('documents', documentId, {
            status: 'failed',
            classification_reasoning: `AI processing failed: ${errMsg.slice(0, 500)}`,
          })
          await create('document_events', {
            document_id: documentId,
            user_id: userId,
            kind: 'failed',
            detail_json: JSON.stringify({ error: errMsg.slice(0, 500) }),
            created_at: new Date(),
          })
        }

        const fresh = await findById<Record<string, unknown>>('documents', documentId)
        if (!fresh) {
          fail(500, 'Document vanished after processing.')
          return
        }

        const fields = (await findMany('document_fields', {
          where: [{ field: 'document_id', operator: '=', value: documentId }],
          orderBy: [{ field: 'key', direction: 'asc' }],
        })) as Record<string, unknown>[]
        const events = (await findMany('document_events', {
          where: [{ field: 'document_id', operator: '=', value: documentId }],
          orderBy: [{ field: 'created_at', direction: 'asc' }],
        })) as Record<string, unknown>[]

        responded = true
        res.status(201).json(serializeDocument(fresh, fields, events))
      })
    },
  )

  req.busboy.on('error', (err: Error) => fail(400, err))
  req.on('aborted', () => fail(499, new Error('Client aborted upload.')))

  req.pipe(req.busboy)
})

export default router
