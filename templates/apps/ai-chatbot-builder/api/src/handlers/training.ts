import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireBotChildOwnership, requireBotOwnership } from '../lib/authz.js'

const router = Router()

const addDocumentSchema = z.object({
  bot_id: z.string().min(1),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(100000),
  source_url: z.string().url().optional().nullable(),
})

router.use(authorizers.auth())

// List knowledge base documents for a bot — owner-only.
router.get('/documents/:botId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.botId as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const { page = '1', limit = '50' } = req.query

    const documents = await findMany('knowledge_documents', {
      where: [{ field: 'bot_id', operator: '=', value: req.params.botId as string }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(documents)
  } catch (error) {
    logger.error('training.listDocuments', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Add document to knowledge base — caller must own the parent bot.
router.post('/documents', validateBody(addDocumentSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { bot_id, title, content, source_url } = req.body
    const botCheck = await requireBotOwnership(String(bot_id), userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }

    const result = await create('knowledge_documents', {
      bot_id,
      title,
      content,
      source_url: source_url || null,
      status: 'indexed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('training.addDocument', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Soft-delete (mark removed) a knowledge document — owner-only via parent bot.
router.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const docCheck = await requireBotChildOwnership(
      'knowledge_documents',
      req.params.id as string,
      userId,
    )
    if (!docCheck.ok) {
      res.status(docCheck.status).json({
        error: t('training.documentNotFound', {}, { defaultValue: 'Document not found' }),
      })
      return
    }

    const result = await updateById('knowledge_documents', req.params.id as string, {
      status: 'removed',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('training.deleteDocument', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get training status for a bot — owner-only.
router.get('/status/:botId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.botId as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const totalIntents = await count('intents', [
      { field: 'bot_id', operator: '=', value: req.params.botId as string },
    ])

    const totalDocuments = await count('knowledge_documents', [
      { field: 'bot_id', operator: '=', value: req.params.botId as string },
    ])

    const indexedDocuments = await count('knowledge_documents', [
      { field: 'bot_id', operator: '=', value: req.params.botId as string },
      { field: 'status', operator: '=', value: 'indexed' },
    ])

    const intents = await findMany<Record<string, unknown>>('intents', {
      where: [{ field: 'bot_id', operator: '=', value: req.params.botId as string }],
    })

    let totalExamples = 0
    for (const intent of intents) {
      const exampleCount = await count('training_examples', [
        { field: 'intent_id', operator: '=', value: String(intent.id) },
      ])
      totalExamples += exampleCount
    }

    res.json({
      total_intents: totalIntents,
      total_examples: totalExamples,
      total_documents: totalDocuments,
      indexed_documents: indexedDocuments,
    })
  } catch (error) {
    logger.error('training.status', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
