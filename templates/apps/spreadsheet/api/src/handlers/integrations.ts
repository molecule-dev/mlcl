/**
 * Integration-connection handlers — owner-scoped storage of OAuth
 * tokens for third-party services. v1 ships record CRUD only; live
 * provider auth flows for Google Drive / Slack / etc. are tracked as
 * propose-new bonds in `docs/flagship-rollout/SHARED-FEATURES.md`
 * (`@molecule/api-channel-*`, `@molecule/api-integration-*`).
 *
 * Tokens are stored as opaque jsonb; production deployments should layer
 * `@molecule/api-encryption` on top so the column is encrypted at rest.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const PROVIDERS = ['google_drive', 'slack', 'zapier', 'notion', 'webhook'] as const
const STATUSES = ['pending', 'connected', 'revoked', 'error'] as const

const integrationCreateSchema = z.object({
  provider: z.enum(PROVIDERS),
  status: z.enum(STATUSES).optional(),
  tokens: z.record(z.string(), z.unknown()).optional(),
})

const integrationUpdateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  tokens: z.record(z.string(), z.unknown()).optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface IntegrationRow {
  id: string
  user_id: string
  provider: string
  status: string
  tokens: Record<string, unknown>
}

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<IntegrationRow>('integration_connections', {
      where: [{ field: 'user_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('integration.list', error)
    res.status(500).json({
      error: t('integration.error.list', {}, { defaultValue: 'Failed to list integrations' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const row = await findOne<IntegrationRow>('integration_connections', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: ownerId },
    ])
    if (!row) {
      res
        .status(404)
        .json({ error: t('integration.notFound', {}, { defaultValue: 'Integration not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('integration.read', error)
    res.status(500).json({
      error: t('integration.error.read', {}, { defaultValue: 'Failed to read integration' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = integrationCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    // Idempotent connect: if the user already has a connection for this
    // provider, update it instead of creating a duplicate. The UI surfaces
    // a single "Connect" button per provider tile and the polished UX
    // assumes a 1:1 user×provider mapping.
    const existing = await findOne<IntegrationRow>('integration_connections', [
      { field: 'user_id', operator: '=', value: ownerId },
      { field: 'provider', operator: '=', value: parsed.data.provider },
    ])
    if (existing) {
      const updated = await updateById<IntegrationRow>('integration_connections', existing.id, {
        status: parsed.data.status ?? existing.status,
        tokens: parsed.data.tokens ?? existing.tokens,
        updated_at: new Date(),
      })
      res.status(200).json(updated.data)
      return
    }
    const result = await create<IntegrationRow>('integration_connections', {
      user_id: ownerId,
      provider: parsed.data.provider,
      status: parsed.data.status ?? 'pending',
      tokens: parsed.data.tokens ?? {},
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('integration.create', error)
    res.status(500).json({
      error: t('integration.error.create', {}, { defaultValue: 'Failed to create integration' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = integrationUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<IntegrationRow>('integration_connections', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('integration.notFound', {}, { defaultValue: 'Integration not found' }) })
      return
    }
    const result = await updateById<IntegrationRow>('integration_connections', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('integration.update', error)
    res.status(500).json({
      error: t('integration.error.update', {}, { defaultValue: 'Failed to update integration' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<IntegrationRow>('integration_connections', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('integration.notFound', {}, { defaultValue: 'Integration not found' }) })
      return
    }
    await deleteById('integration_connections', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('integration.delete', error)
    res.status(500).json({
      error: t('integration.error.delete', {}, { defaultValue: 'Failed to delete integration' }),
    })
  }
})

export default router
