/**
 * Speech handlers — Whisper STT (transcribe), ElevenLabs/OpenAI TTS
 * (synthesize), and a static voice catalogue.
 *
 * All vendor work flows through the bonded `@molecule/api-ai-speech`
 * provider; vendor SDKs are never imported directly here (gate G15).
 *
 * All inputs are validated with zod (gate G5).
 */

import { Router } from 'express'
import { z } from 'zod'

import { requireProvider } from '@molecule/api-ai-speech'
import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { resolvePreferredVoice } from '../lib/voice.js'

const router = Router()

const transcribeSchema = z.object({
  audio: z.string().min(1),
  language: z.string().min(2).max(10).optional(),
  filename: z.string().min(1).max(255).optional(),
})

const synthesizeSchema = z.object({
  text: z.string().min(1).max(20_000),
  voice: z.string().min(1).max(255).optional(),
  voiceId: z.string().min(1).max(255).optional(),
  conversationId: z.string().uuid().optional(),
  provider: z.string().min(1).max(64).optional(),
  model: z.string().min(1).max(255).optional(),
})

router.post('/transcribe', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = transcribeSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({
        error: t('speech.audioRequired', {}, { defaultValue: 'Audio data is required' }),
      })
      return
    }

    const provider = requireProvider()
    if (typeof provider.transcribe !== 'function') {
      res.status(501).json({
        error: t(
          'speech.transcribeUnsupported',
          {},
          { defaultValue: 'Active speech provider does not support transcription' },
        ),
      })
      return
    }

    const audio = Buffer.from(body.data.audio, 'base64')
    const result = await provider.transcribe({
      audio,
      filename: body.data.filename ?? 'audio.wav',
      language: body.data.language ?? 'en',
    })

    res.json({ text: result.text, language: result.language })
  } catch (error) {
    logger.error('speech.transcribe', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/synthesize', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = synthesizeSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({
        error: t('speech.textRequired', {}, { defaultValue: 'Text is required' }),
      })
      return
    }

    const provider = requireProvider()
    // Honor the user's chosen voice (Settings → oauthData.voicePreferences.voice) and any
    // bound agent's voice_id when the request itself didn't specify one — the clients send
    // { text } only, so without this the provider always fell back to its built-in default.
    const voiceId =
      body.data.voiceId ??
      body.data.voice ??
      (await resolvePreferredVoice(userId, body.data.conversationId))

    if (typeof provider.synthesizeSpeech === 'function' && voiceId) {
      const result = await provider.synthesizeSpeech({
        text: body.data.text,
        voiceId,
        model: body.data.model,
      })
      res.setHeader('Content-Type', result.contentType)
      res.send(Buffer.from(result.audio))
      return
    }

    if (typeof provider.synthesize === 'function') {
      const result = await provider.synthesize({
        input: body.data.text,
        voice: voiceId,
        model: body.data.model,
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
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

const voicesQuerySchema = z.object({
  provider: z.string().optional(),
})

router.get('/voices', async (req, res) => {
  try {
    voicesQuerySchema.parse(req.query)
    const provider = requireProvider()
    if (typeof provider.listVoices === 'function') {
      const voices = await provider.listVoices()
      res.json({ voices })
      return
    }
    // Fallback static list — only includes voices the ACTIVE provider can
    // actually synthesize. Listing voices the bond does not implement
    // (e.g. ElevenLabs voices when only OpenAI is bonded) would surface
    // selectable options whose synthesize call returns 5xx.
    res.json({
      voices: [
        {
          voiceId: 'alloy',
          name: t('speech.voices.alloy', {}, { defaultValue: 'Alloy' }),
          provider: 'openai',
        },
        {
          voiceId: 'echo',
          name: t('speech.voices.echo', {}, { defaultValue: 'Echo' }),
          provider: 'openai',
        },
        {
          voiceId: 'fable',
          name: t('speech.voices.fable', {}, { defaultValue: 'Fable' }),
          provider: 'openai',
        },
        {
          voiceId: 'onyx',
          name: t('speech.voices.onyx', {}, { defaultValue: 'Onyx' }),
          provider: 'openai',
        },
        {
          voiceId: 'nova',
          name: t('speech.voices.nova', {}, { defaultValue: 'Nova' }),
          provider: 'openai',
        },
        {
          voiceId: 'shimmer',
          name: t('speech.voices.shimmer', {}, { defaultValue: 'Shimmer' }),
          provider: 'openai',
        },
      ],
    })
  } catch (error) {
    logger.error('speech.voices', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
