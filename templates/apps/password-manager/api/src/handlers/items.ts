import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { PasswordManagerLimits } from '../tiers.js'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  vault_id: z.string().optional(),
  type: z.string().optional(),
  folder: z.string().optional(),
  search: z.string().optional(),
  is_trashed: z.enum(['true', 'false']).optional(),
})

const createItemSchema = z.object({
  vault_id: z.string().optional(),
  name: z.string().min(1).max(500),
  type: z
    .enum(['login', 'card', 'note', 'identity', 'ssh_key', 'api_key', 'wifi'])
    .default('login'),
  username: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  folder: z.string().max(100).nullable().optional(),
  custom_fields: z.array(z.unknown()).optional().default([]),
})

const updateItemSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  username: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  password: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  favorite: z.boolean().optional(),
  folder: z.string().max(100).nullable().optional(),
  custom_fields: z.array(z.unknown()).optional(),
  is_trashed: z.boolean().optional(),
})

// --- Helpers ---

// --- Routes ---

// List items in a vault (metadata only, no secrets)
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { vault_id, type, folder, is_trashed, search } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (vault_id) where.push({ field: 'vault_id', operator: '=', value: vault_id })
    if (type) {
      // Comma-separated values filter as a set (e.g. type=api_key,ssh_key).
      const types = type
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (types.length > 1) where.push({ field: 'type', operator: 'in', value: types })
      else if (types.length === 1) where.push({ field: 'type', operator: '=', value: types[0] })
    }
    if (folder) where.push({ field: 'folder', operator: '=', value: folder })
    if (is_trashed === 'true') {
      where.push({ field: 'is_trashed', operator: '=', value: true })
    } else {
      where.push({ field: 'is_trashed', operator: '=', value: false })
    }

    const items = await findMany('vault_items', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    // Strip encrypted fields from list view
    let safe = (items as Array<Record<string, unknown>>).map((item) => ({
      id: item.id,
      vault_id: item.vault_id,
      name: item.name,
      type: item.type,
      username: item.username,
      url: item.url,
      icon: item.icon,
      folder: item.folder,
      favorite: item.favorite,
      is_trashed: item.is_trashed,
      updated_at: item.updated_at,
    }))
    if (search) {
      const needle = search.toLowerCase()
      safe = safe.filter(
        (row) =>
          String(row.name ?? '')
            .toLowerCase()
            .includes(needle) ||
          String(row.username ?? '')
            .toLowerCase()
            .includes(needle) ||
          String(row.url ?? '')
            .toLowerCase()
            .includes(needle),
      )
    }
    res.json(safe)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get item with decrypted secrets — must check ownership BEFORE decrypting
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const item = await findById<Record<string, unknown>>('vault_items', getParamId(req))
    if (!item || item.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }

    const decrypted: Record<string, unknown> = {
      ...item,
      password: item.encrypted_password ? await decrypt(item.encrypted_password as string) : null,
      notes: item.encrypted_notes ? await decrypt(item.encrypted_notes as string) : null,
    }
    delete decrypted.encrypted_password
    delete decrypted.encrypted_notes

    res.json(decrypted)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create item
// Free-tier item cap — advertised on the pricing page but never enforced, so a free user could
// create unlimited items (the fixtures even ship more than the free cap). Gate the create route.
const itemLimit = enforceLimit<PasswordManagerLimits>({
  limitType: 'maxItems',
  getLimit: (limits) => limits.maxItems,
  getCurrent: async (userId) =>
    count('vault_items', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', itemLimit, validateBody(createItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const now = new Date().toISOString()
    const result = await create('vault_items', {
      vault_id: req.body.vault_id ?? null,
      name: req.body.name,
      type: req.body.type ?? 'login',
      username: req.body.username ?? null,
      url: req.body.url ?? null,
      encrypted_password: req.body.password ? await encrypt(req.body.password) : null,
      encrypted_notes: req.body.notes ? await encrypt(req.body.notes) : null,
      icon: req.body.icon ?? null,
      folder: req.body.folder ?? null,
      custom_fields: JSON.stringify(req.body.custom_fields ?? []),
      favorite: false,
      is_trashed: false,
      owner_id: userId,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update item
router.put('/:id', validateBody(updateItemSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vault_items', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (req.body.name !== undefined) updates.name = req.body.name
    if (req.body.username !== undefined) updates.username = req.body.username
    if (req.body.url !== undefined) updates.url = req.body.url
    if (req.body.password !== undefined && req.body.password !== null) {
      updates.encrypted_password = await encrypt(req.body.password)
    }
    if (req.body.notes !== undefined && req.body.notes !== null) {
      updates.encrypted_notes = await encrypt(req.body.notes)
    }
    if (req.body.favorite !== undefined) updates.favorite = req.body.favorite
    if (req.body.folder !== undefined) updates.folder = req.body.folder
    if (req.body.custom_fields !== undefined)
      updates.custom_fields = JSON.stringify(req.body.custom_fields)
    if (req.body.is_trashed !== undefined) {
      updates.is_trashed = req.body.is_trashed
      updates.trashed_at = req.body.is_trashed ? new Date().toISOString() : null
    }

    const result = await updateById('vault_items', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Toggle favorite
router.post('/:id/favorite', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ favorite: boolean; owner_id: string }>('vault_items', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }

    await updateById('vault_items', id, {
      favorite: !existing.favorite,
      updated_at: new Date().toISOString(),
    })
    res.json({ favorite: !existing.favorite })
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Soft-delete (move to trash)
router.post('/:id/trash', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vault_items', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('vault_items', id, {
      is_trashed: true,
      trashed_at: now,
      updated_at: now,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Restore from trash
router.post('/:id/restore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('vault_items', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }
    const result = await updateById('vault_items', id, {
      is_trashed: false,
      trashed_at: null,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Permanent delete
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<{ owner_id: string }>('vault_items', id)
    if (!existing || existing.owner_id !== userId) {
      res.status(404).json({ error: t('item.notFound', {}, { defaultValue: 'Item not found' }) })
      return
    }
    await deleteById('vault_items', id)
    res.status(204).end()
  } catch (error) {
    logger.error('items.handler', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
