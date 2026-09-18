import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const correctFieldSchema = z.object({
  corrected_value: z.string(),
})

const reprocessSchema = z.object({
  steps: z
    .array(z.enum(['ocr', 'extract', 'classify', 'summarize']))
    .min(1)
    .default(['extract', 'classify', 'summarize']),
})

/**
 * Trigger re-processing of a document. The actual OCR / extract /
 * classify / summarize work is offloaded to background workers in
 * production; here we just queue the request by inserting a
 * `reprocess_requested` event and bouncing the document back to the
 * earliest stage in the requested pipeline.
 */
router.post(
  '/documents/:id/reprocess',
  validateBody(reprocessSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const docId = getParamId(req)
      const doc = await findById<Record<string, unknown>>('documents', docId)
      if (!doc || doc.user_id !== userId) {
        return res.status(404).json({
          error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
        })
      }

      const body = req.body as z.infer<typeof reprocessSchema>
      const firstStep = body.steps[0]
      const nextStatus =
        firstStep === 'ocr'
          ? 'ocring'
          : firstStep === 'extract'
            ? 'extracting'
            : firstStep === 'classify'
              ? 'classifying'
              : 'ready'

      await updateById('documents', docId, { status: nextStatus })

      await create('document_events', {
        document_id: docId,
        user_id: userId,
        kind: 'reprocess_requested',
        detail_json: JSON.stringify({ steps: body.steps }),
        created_at: new Date(),
      })

      res.json({ id: docId, status: nextStatus, steps: body.steps })
    } catch (error) {
      logger.error('processing.reprocess', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

router.get('/documents/:id/fields', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }

    const docId = getParamId(req)
    const doc = await findById<Record<string, unknown>>('documents', docId)
    if (!doc || doc.user_id !== userId) {
      return res.status(404).json({
        error: t('documents.notFound', undefined, { defaultValue: 'Document not found.' }),
      })
    }

    const fields = await findMany('document_fields', {
      where: [{ field: 'document_id', operator: '=', value: docId }],
      orderBy: [{ field: 'key', direction: 'asc' }],
    })
    res.json(fields)
  } catch (error) {
    logger.error('processing.getFields', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.put(
  '/document-fields/:id',
  validateBody(correctFieldSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
        })
      }

      const fieldId = getParamId(req)
      const field = await findById<Record<string, unknown>>('document_fields', fieldId)
      if (!field || field.user_id !== userId) {
        return res.status(404).json({
          error: t('documents.fieldNotFound', undefined, {
            defaultValue: 'Document field not found.',
          }),
        })
      }

      const body = req.body as z.infer<typeof correctFieldSchema>
      const result = await updateById('document_fields', fieldId, {
        corrected_value: body.corrected_value,
        reviewed: true,
      })

      const docId = field.document_id as string | undefined
      if (docId) {
        await create('document_events', {
          document_id: docId,
          user_id: userId,
          kind: 'field_corrected',
          detail_json: JSON.stringify({
            field_id: fieldId,
            key: field.key,
            corrected_value: body.corrected_value,
          }),
          created_at: new Date(),
        })
      }

      res.json((result as { data?: Record<string, unknown> }).data ?? result)
    } catch (error) {
      logger.error('processing.correctField', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, {
          defaultValue: 'Something went wrong. Please try again.',
        }),
      })
    }
  },
)

export default router
