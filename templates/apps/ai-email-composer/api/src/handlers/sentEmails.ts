import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

function handleError(res: Response, err: unknown, where: string): void {
  console.error(`[sentEmails:${where}]`, err)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const querySchema = z.object({
  status: z
    .enum(['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'])
    .optional(),
  draft_id: z.string().uuid().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const parsed = querySchema.safeParse(req.query)
    if (!parsed.success) {
      res.status(400).json({ error: t('errors.validation', {}, { defaultValue: 'Invalid query' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (parsed.data.status) {
      where.push({ field: 'status', operator: '=', value: parsed.data.status })
    }
    if (parsed.data.draft_id) {
      where.push({ field: 'draft_id', operator: '=', value: parsed.data.draft_id })
    }
    const sent = await findMany('sent_emails', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(sent)
  } catch (err) {
    handleError(res, err, 'sentEmails')
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('sent_emails', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sentEmails.notFound', {}, { defaultValue: 'Sent email not found' }) })
      return
    }
    res.json(row)
  } catch (err) {
    handleError(res, err, 'sentEmails')
  }
})

router.get('/analytics/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const userScope: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const withStatus = (status: string): WhereCondition[] => [
      ...userScope,
      { field: 'status', operator: '=', value: status },
    ]
    const [sent, delivered, opened, clicked, replied, bounced] = await Promise.all([
      count('sent_emails', userScope),
      count('sent_emails', withStatus('delivered')),
      count('sent_emails', withStatus('opened')),
      count('sent_emails', withStatus('clicked')),
      count('sent_emails', withStatus('replied')),
      count('sent_emails', withStatus('bounced')),
    ])
    // The frontend reads `total_*` and `*_rate` (snake_case, percentage).
    // We emit BOTH the snake_case "*_rate" percentages used by the UI and
    // the legacy camelCase fractions for any consumer that read the older
    // shape. Rates are integer percentages (0–100), not fractions.
    const pct = (numerator: number, denom: number): number =>
      denom > 0 ? Math.round((numerator / denom) * 100) : 0
    res.json({
      total_sent: sent,
      total_delivered: delivered,
      total_opened: opened,
      total_clicked: clicked,
      total_replied: replied,
      total_bounced: bounced,
      delivery_rate: pct(delivered, sent),
      open_rate: pct(opened, sent),
      click_rate: pct(clicked, sent),
      reply_rate: pct(replied, sent),
      bounce_rate: pct(bounced, sent),
      // Legacy camelCase aliases (kept for back-compat).
      sent,
      opened,
      clicked,
      replied,
      bounced,
      openRate: sent > 0 ? opened / sent : 0,
      clickRate: sent > 0 ? clicked / sent : 0,
      replyRate: sent > 0 ? replied / sent : 0,
      bounceRate: sent > 0 ? bounced / sent : 0,
    })
  } catch (err) {
    handleError(res, err, 'sentEmails')
  }
})

const updateStatusSchema = z.object({
  status: z.enum(['queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']),
})

const archiveSchema = z.object({
  archived: z.boolean(),
})

router.post('/:id/archive', validateBody(archiveSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('sent_emails', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sentEmails.notFound', {}, { defaultValue: 'Sent email not found' }) })
      return
    }
    const { archived } = req.body as z.infer<typeof archiveSchema>
    const result = await updateById('sent_emails', id, {
      archived_at: archived ? new Date() : null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'POST /:id/archive')
  }
})

router.put('/:id/status', validateBody(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const row = await findById<Record<string, unknown>>('sent_emails', id)
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('sentEmails.notFound', {}, { defaultValue: 'Sent email not found' }) })
      return
    }
    const result = await updateById('sent_emails', id, {
      status: req.body.status,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'sentEmails')
  }
})

export default router
