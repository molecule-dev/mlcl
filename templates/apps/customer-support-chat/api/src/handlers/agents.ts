import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const statusSchema = z.object({
  status: z.enum(['online', 'away', 'offline']),
})

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const { status } = req.query
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const agents = await findMany('support_agents', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(agents)
  } catch (error) {
    logger.error('agents.list failed', error)
    next(error)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const agent = await findById<Record<string, unknown>>('support_agents', req.params.id as string)
    if (!agent) {
      return res
        .status(404)
        .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
    }
    if (agent.user_id && agent.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    }
    res.json(agent)
  } catch (error) {
    logger.error('agents.read failed', error)
    next(error)
  }
})

router.put('/:id/status', requireAuth, async (req, res, next) => {
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    // RBAC — agents may only update their own row (matched via user_id).
    const userId = res.locals.session.userId as string
    const target = await findById<Record<string, unknown>>(
      'support_agents',
      req.params.id as string,
    )
    if (!target) {
      return res
        .status(404)
        .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
    }
    if (target.user_id && target.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    }
    const result = await updateById('support_agents', req.params.id as string, {
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('agents.update failed', error)
    next(error)
  }
})

router.get('/:id/stats', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const agent = await findById<Record<string, unknown>>('support_agents', req.params.id as string)
    if (!agent) {
      return res
        .status(404)
        .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
    }
    if (agent.user_id && agent.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    }
    const conversations = await findMany<Record<string, unknown>>('support_conversations', {
      where: [{ field: 'agent_id', operator: '=', value: req.params.id }],
      limit: 1000,
    })
    const open = conversations.filter((c) => c.status === 'open' || c.status === 'assigned').length
    const closed = conversations.filter((c) => c.status === 'closed').length
    res.json({
      open_conversations: open,
      closed_conversations: closed,
      total: conversations.length,
    })
  } catch (error) {
    logger.error('agents.stats failed', error)
    next(error)
  }
})

export default router
