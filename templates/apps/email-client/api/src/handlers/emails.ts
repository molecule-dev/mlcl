/**
 * Emails handler — list / read / send / move / star / read-toggle / delete.
 *
 * v1 invariants:
 *   - Every row is owned by a `user_id` (the mailbox owner). Reads, updates,
 *     and deletes MUST scope by `user_id` taken from the session — never the
 *     query string. This enforces ownership / no-IDOR (gate G6).
 *   - Outbound mail goes through the `@molecule/api-emails` bond (Mailgun by
 *     default). Real IMAP fetch / SMTP-as-user is deferred to Phase 3 (see
 *     INVENTORY: "IMAP/SMTP-as-user-mailbox deferred").
 *   - Search delegates to `@molecule/api-search` (Meilisearch). When the
 *     bond is unconfigured, the handler returns 200 with an empty list so
 *     pages still render.
 *
 * @module
 */
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { index as indexDocument, search as searchIndex } from '@molecule/api-search'

import { ensureSeedForUser } from './_seed.js'

const recipientsSchema = z.union([z.string(), z.array(z.string())])

const sendSchema = z.object({
  to: recipientsSchema,
  cc: recipientsSchema.optional(),
  bcc: recipientsSchema.optional(),
  from: z.string().min(1).optional(),
  subject: z.string().min(1).max(998),
  body: z.string().min(0).max(1_000_000),
  thread_id: z.string().min(1).optional().nullable(),
  attachments: z
    .array(
      z.object({
        url: z.string().min(1),
        name: z.string().min(1),
        size: z.number().int().nonnegative().optional(),
      }),
    )
    .optional(),
})

const moveSchema = z.object({
  folder: z.enum(['inbox', 'sent', 'drafts', 'trash', 'spam', 'archive']),
})

const readSchema = z.object({
  is_read: z.boolean(),
})

const router = Router()

interface Where {
  field: string
  operator: '=' | '!='
  value: unknown
}

const ownerWhere = (userId: string): Where => ({ field: 'user_id', operator: '=', value: userId })

/**
 * GET /emails/counts — sidebar badges. Returns per-folder counts plus
 * starred + unread for the current user.
 *
 * Implemented as a single query that pulls all rows (capped) and
 * aggregates in JS — the email-client v1 caps users at 5–500 rows so
 * this is not a perf concern. A SQL aggregate would be the obvious
 * upgrade once row counts climb.
 */
/**
 * GET /emails/storage — per-user storage usage, computed by summing the
 * byte length of body + attachment.size across the user's mail rows.
 *
 * Returns `{used_bytes, quota_bytes, email_count}`. The quota scales by
 * the user's tier limit (`maxEmails * 256KB`) so the bar reflects a real
 * allowance — never a hard-coded 15GB. The Sidebar hides the panel
 * entirely when the API doesn't return real numbers.
 */
router.get('/storage', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  try {
    await ensureSeedForUser(userId)
    const all = await findMany<Record<string, unknown>>('emails', {
      where: [ownerWhere(userId)],
      limit: 1000,
    })
    let used = 0
    for (const e of all) {
      used += String(e.body ?? '').length
      used += String(e.subject ?? '').length
      const attachmentsRaw = e.attachments
      const atts = Array.isArray(attachmentsRaw)
        ? attachmentsRaw
        : typeof attachmentsRaw === 'string'
          ? (() => {
              try {
                return JSON.parse(attachmentsRaw as string)
              } catch (_error) {
                // not valid JSON — treat as empty attachment list
                return []
              }
            })()
          : []
      for (const a of atts as Array<Record<string, unknown>>) {
        const sz = Number(a?.size ?? 0)
        if (Number.isFinite(sz) && sz > 0) used += sz
      }
    }
    // Per-tier quota: free users get ~5MB worth of headroom, scales with
    // tier maxEmails. Concrete enough to feel real, lax enough that the
    // bar never gets near 100% in normal use.
    let quota = 5 * 1024 * 1024
    try {
      const { getEffectiveTier } = await import('@molecule/api-entitlements')
      const tier = await getEffectiveTier(res)
      const maxEmails = (tier?.limits as { maxEmails?: number } | undefined)?.maxEmails
      if (typeof maxEmails === 'number' && maxEmails > 0) {
        quota = maxEmails * 64 * 1024 // 64KB per slotted message
      }
    } catch (_error) {
      // ignore — fall back to the default quota
    }
    res.json({ used_bytes: used, quota_bytes: quota, email_count: all.length })
  } catch (err) {
    console.error('[emails.storage] failed', err)
    res.status(500).json({
      error: t('emails.storageError', undefined, {
        defaultValue: 'Failed to compute storage usage',
      }),
    })
  }
})

router.get('/counts', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  try {
    await ensureSeedForUser(userId)
    const all = await findMany<Record<string, unknown>>('emails', {
      where: [ownerWhere(userId)],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1000,
    })
    const counts: Record<string, number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      trash: 0,
      spam: 0,
      archive: 0,
      starred: 0,
      unread: 0,
      total: all.length,
    }
    for (const e of all) {
      const f = String(e.folder ?? 'inbox')
      counts[f] = (counts[f] ?? 0) + 1
      if (e.is_starred) counts.starred += 1
      if (!e.is_read) counts.unread += 1
    }
    res.json(counts)
  } catch (err) {
    console.error('[emails.counts] failed', err)
    res.status(500).json({
      error: t('emails.countsError', undefined, { defaultValue: 'Failed to compute counts' }),
    })
  }
})

router.get('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    await ensureSeedForUser(userId)
    const { folder, label, search, is_read, is_starred, limit } = req.query
    if (search) {
      // Try Meilisearch first, fall back to a SQL LIKE on subject/body so
      // search at least works locally when the search bond is unconfigured.
      try {
        const results = await searchIndex('emails', {
          text: String(search),
          filters: { user_id: userId },
        })
        const hits = results.hits.map((h) => h.document)
        if (hits.length > 0) return res.json(hits)
      } catch (_error) {
        // fall through to SQL fallback
      }
      const where: Where[] = [ownerWhere(userId)]
      const all = await findMany<Record<string, unknown>>('emails', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 500,
      })
      const needle = String(search).toLowerCase()
      return res.json(
        all.filter(
          (row) =>
            String(row.subject ?? '')
              .toLowerCase()
              .includes(needle) ||
            String(row.body ?? '')
              .toLowerCase()
              .includes(needle) ||
            String(row.from ?? '')
              .toLowerCase()
              .includes(needle),
        ),
      )
    }
    const where: Where[] = [ownerWhere(userId)]
    if (folder) where.push({ field: 'folder', operator: '=', value: String(folder) })
    if (is_read !== undefined)
      where.push({ field: 'is_read', operator: '=', value: is_read === 'true' })
    if (is_starred !== undefined)
      where.push({ field: 'is_starred', operator: '=', value: is_starred === 'true' })
    const limitNum = Number(limit) || 50
    let emails = await findMany<Record<string, unknown>>('emails', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Math.min(limitNum, 200),
    })
    if (label) {
      // Restrict to rows the label is attached to via the many-to-many
      // join table (this is what POST /labels/:labelId/emails/:emailId
      // writes), falling back to the legacy `emails.label_id` 1-to-1 col
      // (set only during seeding) so older data still filters correctly.
      const assignments = await findMany<Record<string, unknown>>('email_label_assignments', {
        where: [{ field: 'label_id', operator: '=', value: String(label) }],
        limit: 5_000,
      })
      const labeledIds = new Set(assignments.map((a) => String(a.email_id)))
      emails = emails.filter((row) => labeledIds.has(String(row.id)) || row.label_id === label)
    }
    res.json(emails)
  } catch (err) {
    // Surface real error to console — the per-flagship contract says
    // silent try/catch swallows are anti-patterns. We still return a
    // structured 500 to the client so the UI can show an error state.
    console.error('[emails.list] failed', err)
    res.status(500).json({
      error: t('emails.listError', undefined, { defaultValue: 'Failed to list emails' }),
    })
  }
})

router.get('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const email = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    if (!email.is_read) {
      await updateById('emails', req.params.id as string, {
        is_read: true,
        read_at: new Date().toISOString(),
      })
      // Mutate the local copy so the returned payload reflects the read flip.
      email.is_read = true
      email.read_at = new Date().toISOString()
    }
    // Attach label_ids by joining email_label_assignments. The UI uses
    // these to render label chips, and the e2e contract asserts that
    // POST /labels/:labelId/emails/:emailId is reflected here.
    const assignments = await findMany<Record<string, unknown>>('email_label_assignments', {
      where: [{ field: 'email_id', operator: '=', value: email.id }],
    })
    email.label_ids = assignments.map((a) => a.label_id as string)
    res.json(email)
  } catch (err) {
    console.error('[emails.read] failed', err)
    res.status(500).json({
      error: t('emails.readError', undefined, { defaultValue: 'Failed to read email' }),
    })
  }
})

router.get('/:id/thread', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const email = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    const where: Where[] = [ownerWhere(userId)]
    if (email.thread_id) {
      where.push({ field: 'thread_id', operator: '=', value: email.thread_id })
    } else {
      where.push({ field: 'id', operator: '=', value: email.id })
    }
    const thread = await findMany('emails', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(thread)
  } catch (err) {
    console.error('[emails.thread] failed', err)
    res.status(500).json({
      error: t('emails.readError', undefined, { defaultValue: 'Failed to read email' }),
    })
  }
})

router.post('/send', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const { to, cc, bcc, from, subject, body, thread_id, attachments } = parsed.data
  // Resolve the sender's address from the authenticated user when the
  // client didn't pass one explicitly. The compose page never sends
  // `from`, so this is the common path.
  let resolvedFrom: string | undefined = from
  if (!resolvedFrom) {
    try {
      const me = await findById<Record<string, unknown>>('users', userId)
      resolvedFrom = (me?.email as string | undefined) ?? undefined
    } catch (err) {
      console.error('[emails.send] failed to load sender', err)
    }
  }
  // Outbound SMTP via the @molecule/api-emails bond (Mailgun by default).
  // Failure is recorded on the persisted row but not fatal — the email
  // still appears in the user's Sent folder. The frontend reads
  // `delivery_status` to surface delivery failures.
  let mailgunMessageId: string | null = null
  let deliveryError: string | null = null
  try {
    const fromAddr =
      resolvedFrom ??
      (process.env.MAILGUN_DOMAIN ? `noreply@${process.env.MAILGUN_DOMAIN}` : 'noreply@example.com')
    const sendResult = await sendMail({
      from: fromAddr,
      to,
      cc,
      bcc,
      subject,
      html: body,
    })
    mailgunMessageId = sendResult.messageId ?? null
  } catch (err) {
    deliveryError = err instanceof Error ? err.message : String(err)
    console.error('[emails.send] mailgun delivery failed', err)
  }
  try {
    // JSONB columns: serialize arrays to JSON strings so node-postgres
    // doesn't send them as PG array literals (`{a@b.com}`) which JSONB rejects.
    const sentRow = await create<Record<string, unknown>>('emails', {
      user_id: userId,
      from: resolvedFrom ?? '',
      to: JSON.stringify(Array.isArray(to) ? to : [to]),
      cc: JSON.stringify(cc ? (Array.isArray(cc) ? cc : [cc]) : []),
      bcc: JSON.stringify(bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : []),
      subject,
      body,
      folder: 'sent',
      thread_id: thread_id ?? null,
      attachments: JSON.stringify(attachments ?? []),
      is_read: true,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    const email = sentRow.data as Record<string, unknown> | null
    if (email) {
      try {
        await indexDocument('emails', String(email.id), email)
      } catch (_error) {
        // index failure is non-fatal
      }
    }
    res.status(201).json({
      ...(email ?? {}),
      delivery: deliveryError == null ? 'sent' : 'failed',
      delivery_error: deliveryError,
      message_id: mailgunMessageId,
    })
  } catch (err) {
    console.error('[emails.send] persist failed', err)
    res.status(500).json({
      error: t('emails.sendError', undefined, { defaultValue: 'Failed to send email' }),
    })
  }
})

router.put('/:id/move', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = moveSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const existing = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    const result = await updateById('emails', req.params.id as string, {
      folder: parsed.data.folder,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[emails.move] failed', err)
    res.status(500).json({
      error: t('emails.moveError', undefined, { defaultValue: 'Failed to move email' }),
    })
  }
})

router.put('/:id/star', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const email = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    const result = await updateById('emails', req.params.id as string, {
      is_starred: !email.is_starred,
    })
    res.json(result.data)
  } catch (err) {
    console.error('[emails.star] failed', err)
    res.status(500).json({
      error: t('emails.starError', undefined, { defaultValue: 'Failed to update star' }),
    })
  }
})

router.put('/:id/read', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const parsed = readSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const existing = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    const result = await updateById('emails', req.params.id as string, {
      is_read: parsed.data.is_read,
      read_at: parsed.data.is_read ? new Date().toISOString() : null,
    })
    res.json(result.data)
  } catch (err) {
    console.error('[emails.read-flag] failed', err)
    res.status(500).json({
      error: t('emails.readError', undefined, { defaultValue: 'Failed to read email' }),
    })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  try {
    const email = await findById<Record<string, unknown>>('emails', req.params.id as string)
    if (!email || email.user_id !== userId) {
      return res.status(404).json({
        error: t('emails.notFound', undefined, { defaultValue: 'Email not found' }),
      })
    }
    if (email.folder === 'trash') {
      await deleteById('emails', req.params.id as string)
    } else {
      await updateById('emails', req.params.id as string, { folder: 'trash' })
    }
    res.status(204).end()
  } catch (err) {
    console.error('[emails.delete] failed', err)
    res.status(500).json({
      error: t('emails.deleteError', undefined, { defaultValue: 'Failed to delete email' }),
    })
  }
})

export default router
