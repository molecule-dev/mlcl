/**
 * Uploads handler — file-upload audit trail. Mirrors the S3-backed
 * file-upload flow in the app: record an upload row, then transition it
 * through `pending → uploading → uploaded → failed`.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'uploading', 'uploaded', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

// NOTE: the object-storage key is intentionally NOT accepted from the client.
// Letting a caller choose the S3 key would let them address (and, via any future
// download/preview route, read) another tenant's object — a cross-tenant IDOR.
// The key is always minted server-side below, scoped under the owner's user id.
const createSchema = z.object({
  filename: z.string().min(1),
  mime: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
})

const updateSchema = z.object({
  status: z.enum(['pending', 'uploading', 'uploaded', 'failed']),
  error_message: z.string().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const rows = await findMany('uploads', {
    where,
    orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    limit,
  })
  res.json(rows)
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('uploads', {
    user_id: userId,
    filename: body.filename,
    mime: body.mime ?? 'application/octet-stream',
    size_bytes: body.size_bytes ?? 0,
    // Server-minted, owner-scoped key — never a client-supplied value.
    s3_key: `uploads/${userId}/${randomUUID()}`,
    status: 'pending',
  })
  res.status(201).json(result.data)
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<Record<string, unknown>>('uploads', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const patch: Record<string, unknown> = { status: body.status }
  if (body.error_message !== undefined) patch.error_message = body.error_message
  // s3_key is server-minted at create time and is never client-mutable.
  const result = await updateById('uploads', id, patch)
  res.json(result.data)
})

export default router
