import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

router.use(authorizers.auth())

interface SettingsRow {
  id: string
  user_id: string
  bot_tone: string
  auto_escalate: boolean
  greeting: string
  signature: string
  notify_escalations: boolean
  notify_mentions: boolean
  notify_digest: boolean
  quiet_hours: boolean
  updated_at: string | null
  created_at: string
}

const DEFAULTS: Omit<SettingsRow, 'id' | 'user_id' | 'updated_at' | 'created_at'> = {
  bot_tone: 'warm',
  auto_escalate: true,
  greeting: '',
  signature: '',
  notify_escalations: true,
  notify_mentions: true,
  notify_digest: false,
  quiet_hours: false,
}

const updateSettingsSchema = z.object({
  bot_tone: z.string().max(64).optional(),
  auto_escalate: z.boolean().optional(),
  greeting: z.string().max(2_000).optional(),
  signature: z.string().max(2_000).optional(),
  notify_escalations: z.boolean().optional(),
  notify_mentions: z.boolean().optional(),
  notify_digest: z.boolean().optional(),
  quiet_hours: z.boolean().optional(),
})

async function ensureRow(userId: string): Promise<SettingsRow> {
  const existing = await findOne<SettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const now = new Date().toISOString()
  const result = await create('user_settings', {
    user_id: userId,
    ...DEFAULTS,
    created_at: now,
    updated_at: now,
  })
  return result.data
    ? (result.data as unknown as SettingsRow)
    : ({ id: '', user_id: userId, ...DEFAULTS, created_at: now, updated_at: now } as SettingsRow)
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const row = await ensureRow(userId)
    res.json(row)
  } catch (error) {
    logger.error('settings.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/', validateBody(updateSettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const row = await ensureRow(userId)
    const now = new Date().toISOString()
    const result = await updateById('user_settings', row.id, {
      ...req.body,
      updated_at: now,
    })
    res.json(result.data ?? { ...row, ...req.body, updated_at: now })
  } catch (error) {
    logger.error('settings.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
