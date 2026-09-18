import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { log as auditLog } from '@molecule/api-audit'
import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { SecretsManagerLimits } from '../tiers.js'

const router = Router()

const paramId = (req: Request): string => {
  const id = req.params.id
  return Array.isArray(id) ? id[0] : id
}

const listQuerySchema = z.object({
  environment: z.string().optional(),
  vault_id: z.string().uuid().optional(),
  path: z.string().optional(),
})

const createSecretSchema = z.object({
  name: z.string().min(1).max(120),
  key: z.string().min(1).max(120),
  value: z.string().min(1),
  vault_id: z.string().uuid().optional(),
  path: z.string().default('/'),
  kind: z.enum(['token', 'cert', 'db-credential', 'api-key', 'other']).default('token'),
  environment: z.enum(['production', 'staging', 'development', 'test']).default('production'),
  description: z.string().max(2000).optional(),
  rotation_days: z.number().int().min(0).max(3650).default(0),
  tags: z.array(z.string()).optional(),
})

const updateSecretSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  key: z.string().min(1).max(120).optional(),
  value: z.string().min(1).optional(),
  vault_id: z.string().uuid().nullable().optional(),
  path: z.string().optional(),
  kind: z.enum(['token', 'cert', 'db-credential', 'api-key', 'other']).optional(),
  environment: z.enum(['production', 'staging', 'development', 'test']).optional(),
  description: z.string().max(2000).optional(),
  rotation_days: z.number().int().min(0).max(3650).optional(),
  tags: z.array(z.string()).optional(),
})

const rotateSecretSchema = z.object({
  value: z.string().min(1),
  comment: z.string().max(500).optional(),
})

router.get('/secrets', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const where = [{ field: 'user_id', operator: '=' as const, value: uid }]
    const { environment, vault_id, path } = req.query as {
      environment?: string
      vault_id?: string
      path?: string
    }
    if (environment)
      where.push({ field: 'environment', operator: '=' as const, value: environment })
    if (vault_id) where.push({ field: 'vault_id', operator: '=' as const, value: vault_id })
    if (path) where.push({ field: 'path', operator: '=' as const, value: path })

    const rows = await findMany<Record<string, unknown>>('secrets', {
      where,
      orderBy: [{ field: 'key', direction: 'asc' }],
    })
    const safe = rows.map((r) => ({ ...r, value: undefined, has_value: !!r.value }))
    res.json(safe)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/secrets/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const secret = await findById<Record<string, unknown>>('secrets', id)
    if (!secret || secret.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('secrets.notFound', undefined, { defaultValue: 'Secret not found' }) })
    }

    const ciphertext = (secret.value as string | null) ?? null
    const value = ciphertext ? await decrypt(ciphertext) : null
    await auditLog({
      actor: uid,
      action: 'secret.read',
      resource: 'secret',
      resourceId: id,
      details: { key: secret.key },
      ip: req.ip,
    })
    res.json({ ...secret, value })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/secrets',
  enforceLimit<SecretsManagerLimits>({
    limitType: 'maxSecrets',
    getLimit: (limits) => limits.maxSecrets,
    getCurrent: async (uid) => count('secrets', [{ field: 'user_id', operator: '=', value: uid }]),
  }) as unknown as RequestHandler,
  validateBody(createSecretSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const body = req.body as z.infer<typeof createSecretSchema>
      const ciphertext = await encrypt(body.value)
      const result = await create<Record<string, unknown>>('secrets', {
        user_id: uid,
        vault_id: body.vault_id ?? null,
        name: body.name,
        key: body.key,
        path: body.path,
        kind: body.kind,
        environment: body.environment,
        value: ciphertext,
        version: 1,
        description: body.description ?? null,
        rotation_days: body.rotation_days,
        tags: JSON.stringify(body.tags ?? []),
        last_rotated_at: new Date(),
      })

      const created = result.data as Record<string, unknown> | null
      if (created?.id) {
        await create('secret_versions', {
          user_id: uid,
          secret_id: created.id,
          version: 1,
          value: ciphertext,
          created_by: uid,
        })
        await auditLog({
          actor: uid,
          action: 'secret.created',
          resource: 'secret',
          resourceId: String(created.id),
          details: { key: body.key },
          ip: req.ip,
        })
      }

      res.status(201).json({ ...(created ?? {}), value: undefined })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/secrets/:id',
  validateBody(updateSecretSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const id = paramId(req)
      const existing = await findById<Record<string, unknown>>('secrets', id)
      if (!existing || existing.user_id !== uid) {
        return res
          .status(404)
          .json({ error: t('secrets.notFound', undefined, { defaultValue: 'Secret not found' }) })
      }

      const body = req.body as z.infer<typeof updateSecretSchema>
      const updates: Record<string, unknown> = {}
      if (body.name !== undefined) updates.name = body.name
      if (body.key !== undefined) updates.key = body.key
      if (body.path !== undefined) updates.path = body.path
      if (body.kind !== undefined) updates.kind = body.kind
      if (body.environment !== undefined) updates.environment = body.environment
      if (body.description !== undefined) updates.description = body.description
      if (body.rotation_days !== undefined) updates.rotation_days = body.rotation_days
      if (body.vault_id !== undefined) updates.vault_id = body.vault_id
      if (body.tags !== undefined) updates.tags = JSON.stringify(body.tags)
      if (body.value !== undefined) {
        const ciphertext = await encrypt(body.value)
        updates.value = ciphertext
        const nextVersion = ((existing.version as number | undefined) ?? 0) + 1
        updates.version = nextVersion
        updates.last_rotated_at = new Date()
        await create('secret_versions', {
          user_id: uid,
          secret_id: id,
          version: nextVersion,
          value: ciphertext,
          created_by: uid,
        })
      }

      const result = await updateById<Record<string, unknown>>('secrets', id, updates)
      await auditLog({
        actor: uid,
        action: 'secret.updated',
        resource: 'secret',
        resourceId: id,
        details: { key: (existing.key as string | undefined) ?? null },
        ip: req.ip,
      })
      const updated = result.data as Record<string, unknown> | null
      res.json({ ...(updated ?? {}), value: undefined })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/secrets/:id/rotate',
  validateBody(rotateSecretSchema),
  async (req: Request, res: Response) => {
    try {
      const uid = getUserId(res)
      if (!uid)
        return res
          .status(401)
          .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

      const id = paramId(req)
      const existing = await findById<Record<string, unknown>>('secrets', id)
      if (!existing || existing.user_id !== uid) {
        return res
          .status(404)
          .json({ error: t('secrets.notFound', undefined, { defaultValue: 'Secret not found' }) })
      }

      const body = req.body as z.infer<typeof rotateSecretSchema>
      const ciphertext = await encrypt(body.value)
      const nextVersion = ((existing.version as number | undefined) ?? 0) + 1

      const result = await updateById<Record<string, unknown>>('secrets', id, {
        value: ciphertext,
        version: nextVersion,
        last_rotated_at: new Date(),
      })

      await create('secret_versions', {
        user_id: uid,
        secret_id: id,
        version: nextVersion,
        value: ciphertext,
        comment: body.comment ?? null,
        created_by: uid,
      })

      await create('rotations', {
        user_id: uid,
        secret_id: id,
        scheduled_at: new Date(),
        completed_at: new Date(),
        status: 'completed',
        by_actor: uid,
        mode: 'manual',
      })

      const secretKey = (existing.key as string | undefined) ?? 'secret'
      await create('notifications', {
        user_id: uid,
        kind: 'rotation',
        title: t(
          'notifications.rotated.title',
          { key: secretKey },
          { defaultValue: `Secret rotated: ${secretKey}` },
        ),
        body: t(
          'notifications.rotated.body',
          { key: secretKey, version: nextVersion },
          { defaultValue: `${secretKey} is now at version ${nextVersion}.` },
        ),
        data: JSON.stringify({ secretId: id, version: nextVersion, link: `/secrets/${id}` }),
      })

      await auditLog({
        actor: uid,
        action: 'secret.rotated',
        resource: 'secret',
        resourceId: id,
        details: { key: secretKey, version: nextVersion },
        ip: req.ip,
      })
      const updated = result.data as Record<string, unknown> | null
      res.json({ ...(updated ?? {}), value: undefined })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/secrets/:id', async (req: Request, res: Response) => {
  try {
    const uid = getUserId(res)
    if (!uid)
      return res
        .status(401)
        .json({ error: t('errors.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })

    const id = paramId(req)
    const existing = await findById<Record<string, unknown>>('secrets', id)
    if (!existing || existing.user_id !== uid) {
      return res
        .status(404)
        .json({ error: t('secrets.notFound', undefined, { defaultValue: 'Secret not found' }) })
    }
    await deleteById('secrets', id)
    await auditLog({
      actor: uid,
      action: 'secret.deleted',
      resource: 'secret',
      resourceId: id,
      details: { key: (existing.key as string | undefined) ?? null },
      ip: req.ip,
    })
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
