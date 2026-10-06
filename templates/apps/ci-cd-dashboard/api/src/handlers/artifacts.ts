/**
 * Artifacts handler — build output blobs (binaries, archives, reports).
 *
 * `GET /` returns rows decorated by decorators.ts (`type`, `pipeline_name`,
 * working `download_url`). The `:id/download` route serves a small
 * synthetic file containing the artifact metadata so the UI's "Download"
 * button does *something* even without an S3 backend wired in. Storage
 * remains delegated to the S3 bond when configured (`S3_PUBLIC_BASE_URL`).
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'
import { listDecoratedArtifacts, readDecoratedArtifact } from './decorators.js'

const router = Router()

const listQuerySchema = z.object({
  build_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  build_id: z.string().min(1),
  pipeline_id: z.string().optional(),
  name: z.string().min(1),
  filename: z.string().optional(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().min(0).optional(),
  // storage_key is intentionally NOT accepted from the client. The :id/download
  // route below builds an S3 redirect URL straight from storage_key, so a
  // client-chosen key would let a caller address another tenant's object
  // (cross-tenant IDOR). It is minted server-side at create time below.
  type: z.enum(['docker', 'tarball', 'binary', 'sourcemap', 'sbom', 'log']).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    // Lazy demo seeding — every other list endpoint (repositories, pipelines,
    // environments, insights, notifications) seeds a fresh user on first read.
    // GET /artifacts was the only one that didn't, so a client hitting it
    // before any other surface saw an empty list for a brand-new account.
    await seedDemoForUser(userId).catch((err) => logger.warn(err))
    const artifacts = await listDecoratedArtifacts(userId, {
      build_id: req.query.build_id as string | undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    })
    res.json(artifacts)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const artifact = await readDecoratedArtifact(userId, id)
    if (!artifact)
      return res
        .status(404)
        .json({ error: t('artifacts.notFound', {}, { defaultValue: 'Artifact not found' }) })

    // If the deployment has wired S3 publicly via S3_PUBLIC_BASE_URL,
    // redirect to the live URL. Otherwise serve a small synthetic blob so
    // the UI's "Download" button performs a real, observable download.
    if (process.env.S3_PUBLIC_BASE_URL && artifact.storage_key) {
      const target = `${process.env.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(
        artifact.storage_key,
      )}`
      return res.redirect(302, target)
    }

    const body = [
      `# ${artifact.name}`,
      `# pipeline: ${artifact.pipeline_name}`,
      `# size_bytes (recorded): ${artifact.size_bytes}`,
      `# type: ${artifact.type}`,
      `# created_at: ${artifact.created_at}`,
      ``,
      `This is a placeholder bundle served by the dev API for the artifact`,
      `metadata above. Wire S3 (S3_PUBLIC_BASE_URL) for real binary delivery.`,
      ``,
    ].join('\n')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${artifact.filename || artifact.name}.txt"`,
    )
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.send(body)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const artifact = await readDecoratedArtifact(userId, id)
    if (!artifact)
      return res
        .status(404)
        .json({ error: t('artifacts.notFound', {}, { defaultValue: 'Artifact not found' }) })
    res.json(artifact)
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
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const body = req.body as z.infer<typeof createSchema>
    const build = await findById<Record<string, unknown>>('builds', body.build_id)
    if (!build || build.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('builds.notFound', {}, { defaultValue: 'Build not found' }) })
    }
    const artifact = await create('artifacts', {
      user_id: userId,
      build_id: body.build_id,
      pipeline_id: body.pipeline_id ?? build.pipeline_id ?? null,
      name: body.name,
      filename: body.filename ?? body.name,
      size_bytes: body.size_bytes ?? 0,
      mime_type: body.mime_type ?? 'application/octet-stream',
      type: body.type ?? 'binary',
      // Server-minted, owner-scoped key — never a client-supplied value.
      storage_key: `artifacts/${userId}/${randomUUID()}`,
      retention_days: body.retention_days ?? 30,
      created_at: new Date(),
    })
    res.status(201).json(artifact.data ?? artifact)
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
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const id = getParamId(req)
    const artifact = await findById<Record<string, unknown>>('artifacts', id)
    if (!artifact || artifact.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('artifacts.notFound', {}, { defaultValue: 'Artifact not found' }) })
    }
    await deleteById('artifacts', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
