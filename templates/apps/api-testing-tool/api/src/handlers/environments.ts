/**
 * environments handler — variable sets per environment, encrypted at rest.
 *
 * The `variables` column is an AES-encrypted JSON blob via
 * `@molecule/api-encryption-aes`. encrypt / decrypt are async — the
 * previous synchronous flavour was a stale import that would have thrown
 * at runtime.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const variablesSchema = z.array(
  z.object({
    key: z.string(),
    value: z.string(),
    enabled: z.boolean().optional(),
  }),
)

const createEnvironmentSchema = z.object({
  name: z.string().min(1).max(255),
  variables: variablesSchema.optional(),
  is_active: z.boolean().optional(),
})

const updateEnvironmentSchema = createEnvironmentSchema.partial()

async function decryptVariables(value: unknown): Promise<unknown> {
  if (typeof value !== 'string' || value.length === 0) return []
  try {
    const plain = await decrypt(value)
    return JSON.parse(plain || '[]')
  } catch (_error) {
    // decryption or parse failure — return empty variables rather than crashing
    return []
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const rows = (await findMany<Record<string, unknown>>('environments', { where, orderBy })) ?? []
    const decrypted = await Promise.all(
      rows.map(async (row) => ({
        ...row,
        variables: await decryptVariables(row.variables),
      })),
    )
    res.json(decrypted)
  } catch (error) {
    logger.error('environments.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('environments', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('environments.notFound') })
    }
    res.json({ ...row, variables: await decryptVariables(row.variables) })
  } catch (error) {
    logger.error('environments.getById', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createEnvironmentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const variables = await encrypt(JSON.stringify(req.body.variables ?? []))
    if (req.body.is_active === true) {
      await updateMany('environments', [{ field: 'user_id', operator: '=', value: userId }], {
        is_active: false,
      })
    }
    const result = await create('environments', {
      user_id: userId,
      name: req.body.name,
      variables,
      is_active: req.body.is_active ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const data = (result.data ?? {}) as Record<string, unknown>
    res.status(201).json({ ...data, variables: req.body.variables ?? [] })
  } catch (error) {
    logger.error('environments.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateEnvironmentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('environments', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('environments.notFound') })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.variables !== undefined) {
      updates.variables = await encrypt(JSON.stringify(req.body.variables))
    }
    if (req.body.is_active === true) {
      await updateMany('environments', [{ field: 'user_id', operator: '=', value: userId }], {
        is_active: false,
      })
      updates.is_active = true
    } else if (req.body.is_active === false) {
      updates.is_active = false
    }
    const result = await updateById('environments', id, updates)
    const data = (result.data ?? {}) as Record<string, unknown>
    res.json({
      ...data,
      variables: req.body.variables ?? (await decryptVariables(data.variables)),
    })
  } catch (error) {
    logger.error('environments.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('environments', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('environments.notFound') })
    }
    await deleteById('environments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('environments.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
