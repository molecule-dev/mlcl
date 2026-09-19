import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { APP_NAME_FALLBACK, DEFAULT_FROM_NAME } from './_seed.js'

const router = Router()

const publicationSchema = z.object({
  publication_name: z.string().min(1).max(200),
  from_name: z.string().min(1).max(200),
})

interface PublicationRow {
  id: string
  publication_name: string
  from_name: string
}

async function ensurePublicationRow(): Promise<PublicationRow> {
  const rows = (await findMany<PublicationRow>('publication_settings', {
    limit: 1,
  })) as PublicationRow[]
  if (rows[0]) return rows[0]
  // First touch: create the single settings row with the app's display name.
  const now = new Date().toISOString()
  const created = await create('publication_settings', {
    publication_name: process.env.APP_NAME || APP_NAME_FALLBACK,
    from_name: DEFAULT_FROM_NAME,
    created_at: now,
    updated_at: now,
  })
  return created.data as unknown as PublicationRow
}

// GET /publication — the publication identity (name, from-name). Creator-only.
router.get('/publication', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const row = await ensurePublicationRow()
    res.json(row)
  } catch (err) {
    console.error('[settings.publication.get]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// PUT /publication — update publication name + from-name (Settings page).
router.put('/publication', validateBody(publicationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const row = await ensurePublicationRow()
    const result = await updateById('publication_settings', row.id, {
      publication_name: req.body.publication_name,
      from_name: req.body.from_name,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[settings.publication.put]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
