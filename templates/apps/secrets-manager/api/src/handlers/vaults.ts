import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  updateById,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { type RotatableSecret, soonestRotation } from '../lib/rotation.js'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const ENVIRONMENT = z.enum(['development', 'staging', 'production', 'test'])

const createVaultSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional(),
  environment: ENVIRONMENT.default('production'),
  color: z.string().max(40).optional(),
  compliance: z
    .object({
      pci: z.boolean().optional(),
      hipaa: z.boolean().optional(),
      sox: z.boolean().optional(),
    })
    .optional(),
})

const updateVaultSchema = createVaultSchema.partial()

router.get('/vaults', async (_req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const rows = await findMany<Record<string, unknown>>('vaults', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    // Compute each vault's next_rotation from its secrets (rotation_days +
    // last_rotated_at). The column exists + the UI reads it for the rotation
    // pill / expiring filter, but nothing ever populated it.
    const secrets = await findMany<RotatableSecret & { vault_id?: string | null }>('secrets', {
      where: [{ field: 'user_id', operator: '=', value: uid }],
    })
    const byVault = new Map<string, RotatableSecret[]>()
    for (const secret of secrets) {
      const vid = secret.vault_id ? String(secret.vault_id) : ''
      if (!vid) continue
      const list = byVault.get(vid)
      if (list) list.push(secret)
      else byVault.set(vid, [secret])
    }
    const decorated = rows.map((vault) => ({
      ...vault,
      next_rotation: soonestRotation(byVault.get(String(vault.id)) ?? []),
    }))
    res.json(decorated)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/vaults/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const vault = await findById<Record<string, unknown>>('vaults', id)
    if (!vault || vault.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('vaults.notFound', undefined, { defaultValue: 'Vault not found' }) })
    }
    const vaultSecrets = await findMany<RotatableSecret>('secrets', {
      where: [{ field: 'vault_id', operator: '=', value: id }],
    })
    res.json({ ...vault, next_rotation: soonestRotation(vaultSecrets) })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/vaults', validateBody(createVaultSchema), async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const body = req.body as z.infer<typeof createVaultSchema>
    const result = await create<Record<string, unknown>>('vaults', {
      user_id: uid,
      name: body.name,
      slug: body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: body.description ?? null,
      environment: body.environment,
      color: body.color ?? null,
      compliance: JSON.stringify(body.compliance ?? {}),
    })
    res.status(201).json(result.data ?? {})
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/vaults/:id', validateBody(updateVaultSchema), async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('vaults', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('vaults.notFound', undefined, { defaultValue: 'Vault not found' }) })
    }

    const body = req.body as z.infer<typeof updateVaultSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.slug !== undefined) updates.slug = body.slug
    if (body.description !== undefined) updates.description = body.description
    if (body.environment !== undefined) updates.environment = body.environment
    if (body.color !== undefined) updates.color = body.color
    if (body.compliance !== undefined) updates.compliance = JSON.stringify(body.compliance)

    const result = await updateById<Record<string, unknown>>('vaults', id, updates)
    res.json(result.data ?? {})
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/vaults/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('vaults', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('vaults.notFound', undefined, { defaultValue: 'Vault not found' }) })
    }
    await deleteMany('secrets', [
      { field: 'vault_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: uid },
    ])
    await deleteById('vaults', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
