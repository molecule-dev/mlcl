/**
 * `/api/voice/inbound` — the telephony webhook integration point.
 *
 * This is the thin seam where a REAL phone provider (Twilio-style) plugs
 * in. When you wire actual telephony:
 *
 *  1. Point your provider's inbound-voice webhook at this route.
 *  2. Validate the provider's request signature HERE (reject unsigned
 *     calls — this stub intentionally does not trust anything yet).
 *  3. Map the provider's payload (From/To/CallSid) onto the same shape the
 *     simulator uses: match `To` to a voice agent's phone_number, create a
 *     `calls` row, and reply with the greeting to SAY. STT of the caller's
 *     audio and TTS of the reply go through the `@molecule/api-ai-speech`
 *     bond, exactly like `/api/speech/synthesize`.
 *
 * Until then it stays deterministic and provider-agnostic: it accepts
 * `{ to, from? }`, resolves the agent by phone number, opens the session,
 * and returns the greeting plus the URL the caller's next utterance should
 * be posted to. Keep this route thin — all conversation logic lives in
 * `calls.ts` + `lib/agent.ts`.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { agentLanguages, type VoiceAgentRow } from '../lib/agent.js'
import { scriptedReply } from '../lib/languages.js'

const router = Router()

const inboundSchema = z.object({
  to: z.string().min(4).max(40),
  from: z.string().min(4).max(40).optional(),
})

router.post('/inbound', validateBody(inboundSchema), async (req: Request, res: Response) => {
  try {
    // Webhook callers are telephony providers, not browser sessions — but
    // until signature validation is wired (step 2 above) only an
    // authenticated operator may exercise the route.
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { to, from } = req.body as z.infer<typeof inboundSchema>

    const agents = await findMany<VoiceAgentRow>('voice_agents', {
      where: [{ field: 'active', operator: '=', value: true }],
    })
    const agent =
      agents.find((a) => a.phone_number === to) ??
      agents.find((a) => a.phone_number.replace(/\D/g, '') === to.replace(/\D/g, ''))
    if (!agent) {
      res.status(404).json({
        error: t(
          'voice.noAgentForNumber',
          {},
          { defaultValue: 'No active voice agent answers that number' },
        ),
      })
      return
    }

    const language = agentLanguages(agent)[0] ?? 'en'
    const result = await create('calls', {
      voice_agent_id: agent.id,
      user_id: userId,
      direction: 'inbound',
      detected_language: null,
      duration_seconds: 0,
      outcome: null,
      summary: null,
      recording_url: null,
      mode: 'llm',
    })
    const call = (result.data ?? result) as { id: string }

    const greeting = scriptedReply(language, 'greeting')
    await create('call_messages', {
      call_id: call.id,
      role: 'agent',
      text: greeting,
      language,
    })

    // Twilio-style "say this, then gather" instruction — provider adapters
    // translate this to TwiML / their equivalent.
    res.status(201).json({
      call_id: call.id,
      voice_agent: agent.name,
      caller: from ?? null,
      say: greeting,
      language,
      next_utterance_url: `/api/calls/${call.id}/utterance`,
    })
  } catch (error) {
    logger.error('voice.inbound', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
