import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireBotChildOwnership, requireBotOwnership } from '../lib/authz.js'

const router = Router()

const createIntentSchema = z.object({
  bot_id: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  response_template: z.string().max(5000).optional().default(''),
  examples: z.array(z.string().min(1)).optional(),
})

const updateIntentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  response_template: z.string().max(5000).optional(),
})

const addExampleSchema = z.object({
  text: z.string().min(1).max(1000),
})

router.use(authorizers.auth())

// List intents for a bot — only the bot owner may view its intents.
router.get('/bot/:botId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.botId as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const intents = await findMany('intents', {
      where: [{ field: 'bot_id', operator: '=', value: req.params.botId as string }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(intents)
  } catch (error) {
    logger.error('intents.listForBot', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get intent with training examples (scoped via parent bot ownership).
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const intentCheck = await requireBotChildOwnership<{ id: unknown; bot_id: unknown }>(
      'intents',
      req.params.id as string,
      userId,
    )
    if (!intentCheck.ok) {
      res.status(intentCheck.status).json({
        error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }),
      })
      return
    }
    const examples = await findMany('training_examples', {
      where: [{ field: 'intent_id', operator: '=', value: req.params.id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    res.json({ ...(intentCheck.row as Record<string, unknown>), examples })
  } catch (error) {
    logger.error('intents.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create intent — caller must own the parent bot.
router.post('/', validateBody(createIntentSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { bot_id, name, description, response_template, examples } = req.body
    const botCheck = await requireBotOwnership(String(bot_id), userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }

    const result = await create('intents', {
      bot_id,
      name,
      description,
      response_template,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const intent = result.data as Record<string, unknown>

    if (examples && Array.isArray(examples) && intent) {
      for (const example of examples) {
        await create('training_examples', {
          intent_id: intent.id,
          text: example,
          created_at: new Date().toISOString(),
        })
      }
    }

    res.status(201).json(intent)
  } catch (error) {
    logger.error('intents.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update intent — caller must own the parent bot.
router.put('/:id', validateBody(updateIntentSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const intentCheck = await requireBotChildOwnership('intents', req.params.id as string, userId)
    if (!intentCheck.ok) {
      res.status(intentCheck.status).json({
        error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }),
      })
      return
    }

    const result = await updateById('intents', req.params.id as string, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('intents.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add training example to an intent — caller must own the parent bot.
router.post(
  '/:id/examples',
  validateBody(addExampleSchema),
  async (req: Request, res: Response) => {
    try {
      const { text } = req.body
      const userId = res.locals.session.userId as string
      const intentCheck = await requireBotChildOwnership('intents', req.params.id as string, userId)
      if (!intentCheck.ok) {
        res.status(intentCheck.status).json({
          error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }),
        })
        return
      }

      const result = await create('training_examples', {
        intent_id: req.params.id,
        text,
        created_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      logger.error('intents.addExample', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Delete training example — resolve via intent → bot ownership.
router.delete('/examples/:exampleId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const example = await findById<{ intent_id: unknown }>(
      'training_examples',
      req.params.exampleId as string,
    )
    if (!example) {
      res
        .status(404)
        .json({ error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }) })
      return
    }
    const intentCheck = await requireBotChildOwnership('intents', String(example.intent_id), userId)
    if (!intentCheck.ok) {
      res.status(intentCheck.status).json({
        error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }),
      })
      return
    }
    await deleteById('training_examples', req.params.exampleId as string)
    res.status(204).end()
  } catch (error) {
    logger.error('intents.deleteExample', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete intent — caller must own the parent bot.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const intentCheck = await requireBotChildOwnership('intents', req.params.id as string, userId)
    if (!intentCheck.ok) {
      res.status(intentCheck.status).json({
        error: t('intents.notFound', {}, { defaultValue: 'Intent not found' }),
      })
      return
    }
    await deleteById('intents', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('intents.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
