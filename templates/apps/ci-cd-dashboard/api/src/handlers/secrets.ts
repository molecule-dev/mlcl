/**
 * Secrets handler — repository-scoped CI secrets the user manages from
 * Settings → Secrets. We only store a `value_preview` (the first/last
 * few characters); raw values would normally live in a dedicated
 * secrets manager (Vault, AWS Secrets Manager) — this handler is the
 * metadata side that powers the rotate / list / add UI.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(255),
  scope: z.enum(['org', 'env', 'repo']).optional(),
  value: z.string().min(1),
  repository_id: z.string().optional(),
})

const updateSchema = z.object({
  scope: z.enum(['org', 'env', 'repo']).optional(),
  value: z.string().min(1).optional(),
})

function maskValue(raw: string): string {
  const head = raw.slice(0, 4)
  const tail = raw.slice(-4)
  if (raw.length <= 8) return `${head.charAt(0)}•••`
  return `${head}•••••••${tail}`
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const items = await findMany<Record<string, unknown>>('repository_secrets', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(items)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const body = req.body as z.infer<typeof createSchema>
    const created = await create('repository_secrets', {
      user_id: userId,
      repository_id: body.repository_id ?? null,
      name: body.name,
      scope: body.scope ?? 'env',
      value_preview: maskValue(body.value),
      last_used_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(created.data ?? created)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('repository_secrets', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('secrets.notFound', {}, { defaultValue: 'Secret not found' }) })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.scope) updates.scope = body.scope
    if (body.value) {
      updates.value_preview = maskValue(body.value)
      updates.last_used_at = new Date()
    }
    const result = await updateById('repository_secrets', id, updates)
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/rotate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('repository_secrets', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('secrets.notFound', {}, { defaultValue: 'Secret not found' }) })
    }
    const fresh = `${(existing.name as string)
      .replace(/[^A-Z]/g, '')
      .padEnd(4, 'X')}•••••${Math.random().toString(36).slice(-4)}`
    const result = await updateById('repository_secrets', id, {
      value_preview: fresh,
      last_used_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data ?? result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('repository_secrets', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('secrets.notFound', {}, { defaultValue: 'Secret not found' }) })
    }
    await deleteById('repository_secrets', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
