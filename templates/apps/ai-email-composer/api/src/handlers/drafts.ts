import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireProvider as requireAI } from '@molecule/api-ai'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { AiEmailComposerLimits } from '../tiers.js'

async function aiGenerate({
  system,
  prompt,
  maxTokens = 1024,
}: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<{ text: string; usage: { inputTokens: number; outputTokens: number } | null }> {
  const provider = requireAI()
  const stream = provider.chat({
    messages: [{ role: 'user', content: prompt }],
    system,
    maxTokens,
  })
  let text = ''
  let usage: { inputTokens: number; outputTokens: number } | null = null
  for await (const event of stream) {
    if (event.type === 'text') text += event.content
    if (event.type === 'done')
      usage = {
        inputTokens: event.usage?.inputTokens ?? 0,
        outputTokens: event.usage?.outputTokens ?? 0,
      }
  }
  return { text, usage }
}

const router = Router()

const FROM_ADDRESS =
  process.env.EMAIL_FROM ??
  (process.env.MAILGUN_DOMAIN ? `noreply@${process.env.MAILGUN_DOMAIN}` : 'noreply@example.test')

const recipientList = z.array(z.string().email()).default([])

const createDraftSchema = z.object({
  subject: z.string().default(''),
  body: z.string().default(''),
  recipients: recipientList,
  cc: recipientList,
  bcc: recipientList,
  template_id: z.string().uuid().optional(),
  scheduled_at: z.string().datetime().optional(),
  tone: z.string().optional(),
})

// NOTE: do NOT reuse `recipientList` here. `recipientList = z.array(...).default([])`
// — wrapping with `.optional()` keeps the default, so an omitted field round-trips
// as `[]` instead of undefined and the PUT handler then silently overwrites the
// stored recipients/cc/bcc to empty arrays. The update schema must keep omitted
// fields strictly undefined so the handler's `!== undefined` skip works.
const optionalRecipientList = z.array(z.string().email()).optional()

const updateDraftSchema = z.object({
  subject: z.string().optional(),
  body: z.string().optional(),
  recipients: optionalRecipientList,
  cc: optionalRecipientList,
  bcc: optionalRecipientList,
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
  scheduled_at: z.string().datetime().nullish(),
  tone: z.string().nullish(),
})

const composeSchema = z.object({
  prompt: z.string().min(1),
  tone: z.string().optional(),
  context: z.string().optional(),
})

const adjustToneSchema = z.object({
  tone: z.string().min(1),
})

function handleError(res: Response, err: unknown, where: string): void {
  // Surface the real error to dev.log + the response body so the user (and
  // the e2e suite) can see *why* a 500 fired instead of just the generic
  // "Internal server error" text. Production deployments can swap this for
  // a structured logger; the visibility is the point.

  console.error(`[drafts:${where}]`, err)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const drafts = await findMany('email_drafts', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(drafts)
  } catch (err) {
    handleError(res, err, 'GET /')
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
    const draft = await findById<Record<string, unknown>>('email_drafts', id)
    if (!draft || draft.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    res.json(draft)
  } catch (err) {
    handleError(res, err, 'GET /:id')
  }
})

router.post(
  '/',
  enforceLimit<AiEmailComposerLimits>({
    limitType: 'maxDrafts',
    getLimit: (limits) => limits.maxDrafts,
    getCurrent: async (userId) =>
      count('email_drafts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDraftSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createDraftSchema>
      const result = await create('email_drafts', {
        user_id: userId,
        template_id: body.template_id ?? null,
        subject: body.subject,
        body: body.body,
        recipients: JSON.stringify(body.recipients),
        cc: JSON.stringify(body.cc),
        bcc: JSON.stringify(body.bcc),
        tone: body.tone ?? null,
        status: body.scheduled_at ? 'scheduled' : 'draft',
        ai_generated: false,
        scheduled_at: body.scheduled_at ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      handleError(res, err, 'POST /')
    }
  },
)

router.put('/:id', validateBody(updateDraftSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_drafts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateDraftSchema>
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (body.subject !== undefined) updates.subject = body.subject
    if (body.body !== undefined) updates.body = body.body
    if (body.recipients !== undefined) updates.recipients = JSON.stringify(body.recipients)
    if (body.cc !== undefined) updates.cc = JSON.stringify(body.cc)
    if (body.bcc !== undefined) updates.bcc = JSON.stringify(body.bcc)
    if (body.status !== undefined) updates.status = body.status
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at
    if (body.tone !== undefined) updates.tone = body.tone
    const result = await updateById('email_drafts', id, updates)
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'PUT /:id')
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_drafts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    await deleteById('email_drafts', id)
    res.status(204).end()
  } catch (err) {
    handleError(res, err, 'DELETE /:id')
  }
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
    const existing = await findById<Record<string, unknown>>('email_drafts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    const { archived } = req.body as z.infer<typeof archiveSchema>
    const result = await updateById('email_drafts', id, {
      archived_at: archived ? new Date() : null,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'POST /:id/archive')
  }
})

router.post('/compose', validateBody(composeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { prompt, tone, context } = req.body as z.infer<typeof composeSchema>
    const systemParts = [
      "You are an expert email writer. Write a professional, well-structured email body based on the user's description.",
      'Return only the email body text — no subject line, no greeting preamble explanation, no surrounding markdown.',
    ]
    if (tone) systemParts.push(`Write in a ${tone} tone.`)
    if (context) systemParts.push(`Additional context: ${context}`)

    const result = await aiGenerate({
      system: systemParts.join(' '),
      prompt,
    })
    res.json({ body: result.text, usage: result.usage })
  } catch (err) {
    handleError(res, err, 'POST /compose')
  }
})

router.post(
  '/:id/adjust-tone',
  validateBody(adjustToneSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const draft = await findById<Record<string, unknown>>('email_drafts', id)
      if (!draft || draft.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
        return
      }
      if (!draft.body) {
        res.status(400).json({
          error: t(
            'drafts.bodyRequired',
            {},
            { defaultValue: 'Draft body is required to adjust tone' },
          ),
        })
        return
      }
      const { tone } = req.body as z.infer<typeof adjustToneSchema>
      const result = await aiGenerate({
        system: `You are an expert email editor. Rewrite the provided email body in a ${tone} tone. Preserve all key information and intent. Return only the rewritten email body — no explanation.`,
        prompt: draft.body as string,
      })
      const updated = await updateById('email_drafts', id, {
        body: result.text,
        tone,
        updated_at: new Date(),
      })
      res.json({ draft: updated.data, usage: result.usage })
    } catch (err) {
      handleError(res, err, 'POST /:id/adjust-tone')
    }
  },
)

router.post('/:id/summarize', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const draft = await findById<Record<string, unknown>>('email_drafts', id)
    if (!draft || draft.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    if (!draft.body) {
      res.status(400).json({
        error: t(
          'drafts.bodyRequired',
          {},
          { defaultValue: 'Draft body is required to summarize' },
        ),
      })
      return
    }
    const result = await aiGenerate({
      system:
        'You are an expert email summarizer. Produce a concise, two-to-three-sentence summary of the email body. Return only the summary — no preamble.',
      prompt: draft.body as string,
      maxTokens: 256,
    })
    res.json({ summary: result.text })
  } catch (err) {
    handleError(res, err, 'POST /:id/summarize')
  }
})

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string')
    } catch (_error) {
      // JSON.parse failed — value is not a JSON array; treat the raw string as a single-element list
      return [value]
    }
  }
  return []
}

router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const draft = await findById<Record<string, unknown>>('email_drafts', id)
    if (!draft || draft.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    const recipients = parseList(draft.recipients)
    if (recipients.length === 0) {
      res.status(400).json({
        error: t(
          'drafts.recipientsRequired',
          {},
          { defaultValue: 'At least one recipient is required' },
        ),
      })
      return
    }
    if (!draft.subject) {
      res.status(400).json({
        error: t(
          'drafts.subjectRequired',
          {},
          { defaultValue: 'Subject is required before sending' },
        ),
      })
      return
    }

    const ccList = parseList(draft.cc)
    const bccList = parseList(draft.bcc)
    const bodyText = (draft.body as string) ?? ''
    // Append the sender's saved signature (Settings → Preferences, passed from
    // the composer) to every outgoing message. It was previewed but never sent.
    const signature =
      typeof (req.body as { signature?: unknown })?.signature === 'string'
        ? (req.body as { signature: string }).signature.trim().slice(0, 2000)
        : ''
    const finalBody = signature ? `${bodyText}\n\n${signature}` : bodyText

    let mailgunMessageId: string | undefined
    if (process.env.MAILGUN_API_KEY) {
      const result = await sendMail({
        from: FROM_ADDRESS,
        to: recipients,
        cc: ccList.length > 0 ? ccList : undefined,
        bcc: bccList.length > 0 ? bccList : undefined,
        subject: String(draft.subject),
        text: finalBody,
        html: finalBody,
      })
      mailgunMessageId = result.messageId
    }

    const sentAt = new Date()
    await updateById('email_drafts', id, {
      status: 'sent',
      sent_at: sentAt,
      mailgun_message_id: mailgunMessageId ?? null,
      updated_at: sentAt,
    })

    for (const recipient of recipients) {
      await create('sent_emails', {
        user_id: userId,
        draft_id: id,
        recipient_email: recipient,
        status: mailgunMessageId ? 'queued' : 'sent',
        mailgun_message_id: mailgunMessageId ?? null,
        created_at: sentAt,
        updated_at: sentAt,
      })
    }

    res.json({ success: true, messageId: mailgunMessageId ?? null, recipients })
  } catch (err) {
    handleError(res, err, 'POST /:id/send')
  }
})

const scheduleSchema = z.object({
  scheduled_at: z.string().datetime(),
})

router.post('/:id/schedule', validateBody(scheduleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('email_drafts', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({ error: t('drafts.notFound', {}, { defaultValue: 'Draft not found' }) })
      return
    }
    const { scheduled_at } = req.body as z.infer<typeof scheduleSchema>
    const result = await updateById('email_drafts', id, {
      status: 'scheduled',
      scheduled_at,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    handleError(res, err, 'POST /:id/schedule')
  }
})

export default router
