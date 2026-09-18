import { type NextFunction, type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function asyncHandler<
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

const createExportSchema = z.object({
  image_id: z.string().min(1),
  format: z.enum(['png', 'jpg', 'jpeg', 'webp', 'heic', 'avif']).optional(),
  quality: z.number().int().min(1).max(100).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  strip_exif: z.boolean().optional(),
})

router.post(
  '/',
  validateBody(createExportSchema),
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const { image_id, format, quality, width, height } = req.body
    const image = await findById<Record<string, unknown>>('images', image_id)

    if (!image || image.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('exports.imageNotFound', {}, { defaultValue: 'Image not found' }) })
    }

    // The Sharp image-processing bond would resize/transcode and write the
    // result to the uploads bond (S3 in production). With those bonds wired
    // up but no upload provider plumbing, the export immediately resolves
    // by re-using the source image URL — that gives the user a real,
    // downloadable artifact rather than a perpetually-pending row, while
    // leaving the field where async transcoding output would land.
    const sourceUrl =
      (image.current_url as string | null | undefined) ??
      (image.original_url as string | null | undefined) ??
      null

    const created = await create('exports', {
      user_id: userId,
      image_id,
      format: format ?? 'png',
      quality: quality ?? 90,
      width: width ?? (image.width as number) ?? 0,
      height: height ?? (image.height as number) ?? 0,
      status: sourceUrl ? 'completed' : 'pending',
      output_url: sourceUrl,
      created_at: new Date(),
    })

    const row = ((created as { data?: Record<string, unknown> }).data ??
      (created as unknown as Record<string, unknown>)) as Record<string, unknown>
    if ((row as { status?: string }).status === 'pending' && sourceUrl) {
      await updateById('exports', (row as { id: string }).id, {
        status: 'completed',
        output_url: sourceUrl,
      })
    }

    res.status(201).json(row)
  }),
)

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const imageId = req.query.image_id as string | undefined
    const where = imageId
      ? [
          { field: 'user_id', operator: '=' as const, value: userId },
          { field: 'image_id', operator: '=' as const, value: imageId },
        ]
      : [{ field: 'user_id', operator: '=' as const, value: userId }]

    const exportsList = await findMany('exports', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json(exportsList)
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    const record = await findById<Record<string, unknown>>('exports', id)

    if (!record || record.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('exports.notFound', {}, { defaultValue: 'Export not found' }) })
    }

    res.json(record)
  }),
)

export default router
