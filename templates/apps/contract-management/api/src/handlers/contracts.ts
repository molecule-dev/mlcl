/**
 * /api/contracts — CRUD over the `contracts` table.
 *
 * GET / returns a flat list with status normalized so the UI status
 * filter set ('expiring' as a derived state from active+near-expiry)
 * matches what the page expects.
 *
 * GET /:id enriches the row with `counterparty` (display name),
 * `signers[]` (queried from the signatures table), `audit_log[]`
 * (queried from signature_events), `body_html` and a stable display
 * `number` so the detail page renders without further round-trips.
 *
 * Side-effects:
 *  - POST creates a signatures row for the party_email if provided
 *    (so the signing flow has somewhere to land) and a notifications
 *    row so /notifications and the dashboard activity feed reflect it.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireUserOwnership } from '../lib/authz.js'
import { ownerWantsNotification } from '../lib/notify-prefs.js'
import { sanitizeHtml } from '../lib/sanitize-html.js'
import type { ContractManagementLimits } from '../tiers.js'

const router = Router()

const createContractSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).optional(),
  template_id: z.string().uuid().nullable().optional(),
  counterparty_id: z.string().uuid().nullable().optional(),
  party_name: z.string().max(500).optional().default(''),
  party_email: z.string().email().max(320).nullable().optional(),
  type: z.string().max(64).optional(),
  amount_cents: z.number().int().nonnegative().optional(),
  value: z.number().nonnegative().nullable().optional(),
  currency: z.string().min(3).max(3).optional(),
  effective_at: z.string().datetime().nullable().optional(),
  expires_at: z.string().datetime().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  body_html: z.string().max(1_000_000).optional(),
  body_md: z.string().max(1_000_000).optional(),
  file_url: z.string().url().nullable().optional(),
})

const updateContractSchema = createContractSchema.partial().extend({
  status: z
    .enum(['draft', 'pending', 'active', 'expiring', 'expired', 'voided', 'terminated'])
    .optional(),
})

const sendForSignatureSchema = z.object({
  signer_name: z.string().min(1).max(500).optional(),
  signer_email: z.string().email().max(320).optional(),
})

interface ContractRow {
  id: string
  user_id: string
  number: string | null
  title: string
  description: string | null
  template_id: string | null
  counterparty_id: string | null
  party_name: string
  party_email: string | null
  type: string
  status: string
  amount_cents: number | null
  value: string | number | null
  currency: string
  effective_at: string | null
  expires_at: string | null
  start_date: string | null
  end_date: string | null
  body_html: string
  body_md: string
  file_url: string | null
  esign_request_id: string | null
  signed_at?: string | null
  sent_at?: string | null
  created_at: string
  updated_at: string | null
}

interface CounterpartyRow {
  id: string
  organization: string
  email: string | null
  contact_name: string
}

interface SignatureRow {
  id: string
  contract_id: string
  user_id: string
  signer_name: string
  signer_email: string
  role: string
  order: number
  status: string
  signed_at: string | null
  ip: string | null
  requested_at: string
}

interface SignatureEventRow {
  id: string
  contract_id: string
  signature_id: string | null
  user_id: string
  kind: string
  occurred_at: string
  payload: Record<string, unknown> | null
}

const DAY_MS = 86_400_000

function normalizeStatus(c: ContractRow): string {
  const s = c.status ?? 'draft'
  if (s !== 'active') return s
  if (!c.expires_at) return s
  const t = Date.parse(c.expires_at)
  if (!Number.isFinite(t)) return s
  if (t < Date.now()) return 'expired'
  if (t < Date.now() + 30 * DAY_MS) return 'expiring'
  return s
}

function shapeListItem(
  c: ContractRow,
  counterparty?: CounterpartyRow | null,
): {
  id: string
  title: string
  counterparty: string
  counterparty_id: string | null
  type: string
  status: string
  amount_cents: number
  effective_at: string | null
  expires_at: string | null
  owner_name: string
} {
  return {
    id: c.id,
    title: c.title,
    counterparty: counterparty?.organization ?? c.party_name ?? '',
    counterparty_id: c.counterparty_id,
    type: c.type ?? 'other',
    status: normalizeStatus(c),
    amount_cents: c.amount_cents ?? 0,
    effective_at: c.effective_at,
    expires_at: c.expires_at,
    owner_name: '',
  }
}

router.use(authorizers.auth())

router.get('/', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const { status, limit = '50', page = '1' } = req.query
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (status && status !== 'all' && status !== 'expiring') {
    where.push({ field: 'status', operator: '=', value: String(status) })
  }
  const items = await findMany<ContractRow>('contracts', {
    where,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
  })
  const cps = await findMany<CounterpartyRow>('counterparties', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  const cpById = new Map<string, CounterpartyRow>(cps.map((c) => [c.id, c]))
  let shaped = items.map((c) =>
    shapeListItem(c, c.counterparty_id ? (cpById.get(c.counterparty_id) ?? null) : null),
  )
  if (status === 'expiring') shaped = shaped.filter((c) => c.status === 'expiring')
  res.json(shaped)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<ContractRow>(
    'contracts',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
    return
  }
  const c = check.row
  const counterparty = c.counterparty_id
    ? await findById<CounterpartyRow>('counterparties', c.counterparty_id).catch(() => null)
    : null
  const signers = await findMany<SignatureRow>('signatures', {
    where: [{ field: 'contract_id', operator: '=', value: c.id }],
    orderBy: [
      { field: 'order', direction: 'asc' },
      { field: 'requested_at', direction: 'asc' },
    ],
    limit: 100,
  })
  const events = await findMany<SignatureEventRow>('signature_events', {
    where: [{ field: 'contract_id', operator: '=', value: c.id }],
    orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    limit: 100,
  })
  res.json({
    id: c.id,
    number: c.number ?? c.id.slice(0, 8).toUpperCase(),
    title: c.title,
    description: c.description ?? '',
    counterparty: counterparty?.organization ?? c.party_name ?? '',
    counterparty_id: c.counterparty_id,
    party_name: c.party_name,
    party_email: c.party_email,
    type: c.type ?? 'other',
    status: normalizeStatus(c),
    amount_cents: c.amount_cents ?? 0,
    currency: c.currency,
    effective_at: c.effective_at,
    expires_at: c.expires_at,
    start_date: c.start_date,
    end_date: c.end_date,
    body_html: c.body_html || (c.body_md ? `<pre>${escapeHtml(c.body_md)}</pre>` : ''),
    body_md: c.body_md,
    file_url: c.file_url,
    sent_at: c.sent_at ?? null,
    signed_at: c.signed_at ?? null,
    signers: signers.map((s) => ({
      id: s.id,
      name: s.signer_name,
      email: s.signer_email,
      role: s.role,
      order: s.order,
      status: s.status as 'pending' | 'viewed' | 'signed' | 'declined',
      signed_at: s.signed_at,
      ip: s.ip ?? undefined,
    })),
    audit_log: events.map((ev) => ({
      id: ev.id,
      occurred_at: ev.occurred_at,
      actor: 'You',
      action: ev.kind,
    })),
  })
})

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

router.post(
  '/',
  enforceLimit<ContractManagementLimits>({
    limitType: 'maxContracts',
    getLimit: (limits) => limits.maxContracts,
    getCurrent: async (userId) =>
      count('contracts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createContractSchema),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof createContractSchema>
    const now = new Date().toISOString()
    const result = await create<ContractRow>('contracts', {
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
      template_id: body.template_id ?? null,
      counterparty_id: body.counterparty_id ?? null,
      party_name: body.party_name ?? '',
      party_email: body.party_email ?? null,
      type: body.type ?? 'msa',
      status: 'draft',
      amount_cents: body.amount_cents ?? 0,
      value: body.value ?? null,
      currency: body.currency ?? 'USD',
      effective_at: body.effective_at ?? null,
      expires_at: body.expires_at ?? null,
      start_date: body.start_date ?? null,
      end_date: body.end_date ?? null,
      // Sanitize client-supplied HTML at the trust boundary before storing —
      // it is later rendered (incl. to counterparties) via dangerouslySetInnerHTML.
      body_html: sanitizeHtml(body.body_html ?? ''),
      body_md: body.body_md ?? '',
      file_url: body.file_url ?? null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    const created = (result.data ?? result) as ContractRow
    res.status(201).json(created)
  },
)

router.patch('/:id', validateBody(updateContractSchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<ContractRow>(
    'contracts',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
    return
  }
  const patch: Record<string, unknown> = {
    ...(req.body as Record<string, unknown>),
    updated_at: new Date().toISOString(),
  }
  // Sanitize client-supplied HTML at the trust boundary before storing —
  // it is later rendered (incl. to counterparties) via dangerouslySetInnerHTML.
  if (typeof patch.body_html === 'string') {
    patch.body_html = sanitizeHtml(patch.body_html)
  }
  const result = await updateById<ContractRow>('contracts', req.params.id as string, patch)
  res.json(result.data ?? result)
})

router.post(
  '/:id/send',
  validateBody(sendForSignatureSchema),
  async (req: Request, res: Response) => {
    const userId = res.locals.session.userId as string
    const check = await requireUserOwnership<ContractRow>(
      'contracts',
      req.params.id as string,
      userId,
    )
    if (!check.ok) {
      res
        .status(check.status)
        .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
      return
    }
    const c = check.row
    const body = req.body as z.infer<typeof sendForSignatureSchema>
    const signerName = body.signer_name ?? c.party_name ?? 'Counterparty'
    const signerEmail = body.signer_email ?? c.party_email
    if (!signerEmail) {
      res.status(400).json({
        error: t('contract.signerEmailRequired', {}, { defaultValue: 'Signer email required.' }),
      })
      return
    }
    const now = new Date().toISOString()
    const token = randomBytes(24).toString('hex')
    await updateById('contracts', c.id, { status: 'pending', sent_at: now, updated_at: now })
    await create('signatures', {
      contract_id: c.id,
      user_id: userId,
      signer_name: signerName,
      signer_email: signerEmail,
      role: 'counterparty',
      order: 1,
      status: 'pending',
      token,
      token_expires_at: new Date(Date.now() + 30 * DAY_MS).toISOString(),
      requested_at: now,
      created_at: now,
    })
    await create('signature_events', {
      contract_id: c.id,
      user_id: userId,
      kind: 'sent',
      occurred_at: now,
      created_at: now,
    })
    // Honor the owner's "Contract sent for signature" notification toggle
    // (Settings → oauthData.notificationPreferences.contractSent). The
    // counterparty signing email below is the send action itself, not an
    // owner notification, so it is NOT gated by this preference.
    if (await ownerWantsNotification(userId, 'contractSent')) {
      await create('notifications', {
        user_id: userId,
        kind: 'sent',
        title: `Sent ${c.title} for signature`,
        body: `Sent to ${signerEmail}`,
        contract_id: c.id,
        link: `/contracts/${c.id}`,
        created_at: now,
      })
    }

    const appUrl = process.env.SITE_ORIGIN ?? 'http://localhost:3000'
    const signingLink = `${appUrl.replace(/\/$/, '')}/sign/${token}`
    let emailDelivered = false
    try {
      await sendMail({
        from:
          process.env.EMAIL_FROM ?? `contracts@${process.env.MAILGUN_DOMAIN ?? 'flagship.test'}`,
        to: signerEmail,
        subject: t(
          'contract.signEmailSubject',
          { title: c.title },
          { defaultValue: `Please sign: ${c.title}` },
        ),
        text: t(
          'contract.signEmailBody',
          { signerName, title: c.title, link: signingLink },
          {
            defaultValue:
              `Hi ${signerName},\n\n` +
              `You have been asked to review and sign "${c.title}". ` +
              `Open the link below to view the contract and add your signature:\n\n` +
              `${signingLink}\n\n` +
              `This link expires in 30 days.\n\n` +
              `Thank you.`,
          },
        ),
      })
      emailDelivered = true
    } catch (error) {
      // Email send failures (sandbox bounces, etc.) must not block the status
      // flip — the contract row, signature row, and notification above are
      // the source of truth for the "sent for signature" state.
      logger.warn('contracts.send.email', error)
    }

    const fresh = (await findById<ContractRow>('contracts', c.id)) as ContractRow
    res.json({ ...fresh, email_delivered: emailDelivered, signing_link: signingLink })
  },
)

router.post('/:id/sign', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<ContractRow>(
    'contracts',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
    return
  }
  const c = check.row
  const now = new Date().toISOString()
  const signers = await findMany<SignatureRow>('signatures', {
    where: [{ field: 'contract_id', operator: '=', value: c.id }],
    limit: 100,
  })
  for (const s of signers) {
    if (s.status !== 'signed') {
      await updateById('signatures', s.id, { status: 'signed', signed_at: now })
    }
  }
  await updateById('contracts', c.id, { status: 'active', signed_at: now, updated_at: now })
  await create('signature_events', {
    contract_id: c.id,
    user_id: userId,
    kind: 'signed',
    occurred_at: now,
    created_at: now,
  })
  // Honor the owner's "Signed or declined" notification toggle.
  if (await ownerWantsNotification(userId, 'contractSigned')) {
    await create('notifications', {
      user_id: userId,
      kind: 'signed',
      title: `${c.title} signed`,
      body: 'All required parties have signed.',
      contract_id: c.id,
      link: `/contracts/${c.id}`,
      created_at: now,
    })
  }
  const fresh = await findById<ContractRow>('contracts', c.id)
  res.json(fresh)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireUserOwnership<ContractRow>(
    'contracts',
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('contract.notFound', {}, { defaultValue: 'Contract not found' }) })
    return
  }
  await deleteById('contracts', req.params.id as string)
  res.status(204).end()
})

export default router
