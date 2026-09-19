/**
 * `/api/voice-agents` — CRUD for the multilingual phone receptionists
 * (languages, per-language voices, upsell/discount policy, transfer rules,
 * after-hours message). This configuration feeds both the Call Simulator
 * and the agent system prompt at `lib/agent.ts`.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { DEFAULT_AGENT_LANGUAGES } from '../lib/languages.js'

const router = Router()

const languageSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/, 'expected a BCP-47 tag like en or pt-BR')

const createSchema = z.object({
  name: z.string().min(1).max(120),
  phone_number: z.string().min(4).max(40),
  languages: z.array(languageSchema).min(1).max(12).optional(),
  voice_by_language: z.record(z.string().max(10), z.string().max(120)).optional(),
  upsell_enabled: z.boolean().optional(),
  max_discount_percent: z.coerce.number().int().min(0).max(80).optional(),
  transfer_to_human_on: z.array(z.string().max(60)).max(12).optional(),
  after_hours_message: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany('voice_agents', {
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('voice-agents.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const row = await findOne('voice_agents', [
      { field: 'id', operator: '=', value: getParamId(req) },
    ])
    if (!row) {
      res
        .status(404)
        .json({ error: t('voiceAgents.notFound', {}, { defaultValue: 'Voice agent not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('voice-agents.detail', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const result = await create('voice_agents', {
      name: body.name,
      phone_number: body.phone_number,
      languages: JSON.stringify(body.languages ?? [...DEFAULT_AGENT_LANGUAGES]),
      voice_by_language: JSON.stringify(body.voice_by_language ?? {}),
      upsell_enabled: body.upsell_enabled ?? true,
      max_discount_percent: body.max_discount_percent ?? 10,
      transfer_to_human_on: JSON.stringify(
        body.transfer_to_human_on ?? ['explicit_request', 'complaint', 'payment_issue'],
      ),
      after_hours_message: body.after_hours_message ?? null,
      active: body.active ?? true,
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    logger.error('voice-agents.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response) => {
    try {
      if (!getUserId(res)) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof updateSchema>
      const patch: Record<string, unknown> = {}
      if (body.name !== undefined) patch.name = body.name
      if (body.phone_number !== undefined) patch.phone_number = body.phone_number
      if (body.languages !== undefined) patch.languages = JSON.stringify(body.languages)
      if (body.voice_by_language !== undefined)
        patch.voice_by_language = JSON.stringify(body.voice_by_language)
      if (body.upsell_enabled !== undefined) patch.upsell_enabled = body.upsell_enabled
      if (body.max_discount_percent !== undefined)
        patch.max_discount_percent = body.max_discount_percent
      if (body.transfer_to_human_on !== undefined)
        patch.transfer_to_human_on = JSON.stringify(body.transfer_to_human_on)
      if (body.after_hours_message !== undefined)
        patch.after_hours_message = body.after_hours_message
      if (body.active !== undefined) patch.active = body.active
      const result = await updateById('voice_agents', getParamId(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('voice-agents.update', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    await deleteById('voice_agents', getParamId(req))
    res.status(204).end()
  } catch (error) {
    logger.error('voice-agents.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
