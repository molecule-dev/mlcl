/**
 * Agent handlers — list / read / create / update agent personas.
 *
 * Architecture:
 *   - All persistence flows through `@molecule/api-database`'s DataStore
 *     (`findById`, `findMany`, `create`, `updateById`).  No raw SQL.
 *   - All inputs validated with zod.
 *   - Per-id reads/writes scope by `user_id` to prevent IDOR.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

interface AgentRow {
  id: string
  user_id: string
  name: string
  system_prompt: string
  model: string
  voice_id: string | null
  tools: unknown
  persona_avatar_url: string | null
  created_at: string
  updated_at: string
}

const router = Router()

const createSchema = z.object({
  name: z.string().min(1).max(120),
  system_prompt: z.string().max(20_000).optional(),
  voice_id: z.string().max(120).nullable().optional(),
  model: z.string().max(120).optional(),
})

const updateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    system_prompt: z.string().max(20_000).optional(),
    voice_id: z.string().max(120).nullable().optional(),
    model: z.string().max(120).optional(),
    // Free-form persona tunables (tempo, warmth sliders, capabilities map).
    // Stored as jsonb so the UI can evolve without further migrations.
    tools: z
      .object({
        tempo: z.number().int().min(0).max(100).optional(),
        warmth: z.number().int().min(0).max(100).optional(),
        capabilities: z.record(z.string(), z.boolean()).optional(),
      })
      .optional(),
  })
  .strict()

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const agents = await findMany<AgentRow>('agents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(agents)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const agent = await findById<AgentRow>('agents', params.data.id)
    if (!agent || agent.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    res.json(agent)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const result = await create<AgentRow>('agents', {
      user_id: userId,
      name: body.data.name,
      system_prompt: body.data.system_prompt ?? '',
      model: body.data.model ?? 'claude-sonnet-4-6',
      voice_id: body.data.voice_id ?? null,
      tools: [],
    })
    res.status(201).json(result.data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    const body = updateSchema.safeParse(req.body)
    if (!params.success || !body.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const agent = await findById<AgentRow>('agents', params.data.id)
    if (!agent || agent.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const result = await updateById<AgentRow>('agents', params.data.id, body.data)
    res.json(result.data)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const agent = await findById<AgentRow>('agents', params.data.id)
    if (!agent || agent.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    await deleteById('agents', params.data.id)
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
