/**
 * `/api/speech` — OPTIONAL text-to-speech for agent replies.
 *
 * The transcript is the primary UX; the Call Simulator's "Speak replies"
 * toggle synthesizes agent turns through the bonded
 * `@molecule/api-ai-speech` provider (OpenAI by default). Without an API
 * key the provider is unusable and this route returns 501 — the UI treats
 * that as "voice unavailable" and stays on transcript.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireProvider } from '@molecule/api-ai-speech'
import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const synthesizeSchema = z.object({
  text: z.string().min(1).max(4000),
  voice: z.string().min(1).max(120).optional(),
  language: z.string().min(2).max(10).optional(),
})

router.post('/synthesize', validateBody(synthesizeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof synthesizeSchema>

    let provider: ReturnType<typeof requireProvider> | null = null
    try {
      provider = requireProvider()
    } catch (_error) {
      provider = null
    }
    if (!provider) {
      res.status(501).json({
        error: t(
          'speech.unavailable',
          {},
          { defaultValue: 'Speech synthesis is not configured on this server' },
        ),
      })
      return
    }

    if (typeof provider.synthesize === 'function') {
      const result = await provider.synthesize({
        input: body.text,
        voice: body.voice,
      })
      res.setHeader('Content-Type', result.contentType)
      res.send(Buffer.from(result.audio))
      return
    }
    if (typeof provider.synthesizeSpeech === 'function' && body.voice) {
      const result = await provider.synthesizeSpeech({
        text: body.text,
        voiceId: body.voice,
        languageCode: body.language,
      })
      res.setHeader('Content-Type', result.contentType)
      res.send(Buffer.from(result.audio))
      return
    }
    res.status(501).json({
      error: t(
        'speech.synthesizeUnsupported',
        {},
        { defaultValue: 'Active speech provider does not support synthesis' },
      ),
    })
  } catch (error) {
    logger.error('speech.synthesize', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
