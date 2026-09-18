import { randomBytes } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { hasTransport, sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

// [L2-1] Escape user/profile-derived values before interpolating into the invitation
// email HTML — an unescaped owner name or personal note is an HTML/script-injection
// vector in the recipient's mail client.
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// `scope` is persisted as a JSON string (see the create handler). Parse it back to
// an array for API responses; tolerate a malformed/legacy value rather than throw.
const safeParseScope = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch (_error) {
    // Malformed stored JSON is treated as "shared with nobody" — the safe default for an access list.
    return []
  }
}

const acceptSchema = z.object({ token: z.string().min(1) })

const ALLOWED_ROLES = ['provider', 'caregiver', 'viewer'] as const
const ALLOWED_SCOPES = [
  'records',
  'medications',
  'labs',
  'documents',
  'visits',
  'immunizations',
] as const

const createSchema = z.object({
  recipient_email: z.string().email(),
  recipient_name: z.string().optional(),
  role: z.enum(ALLOWED_ROLES).default('viewer'),
  scope: z.array(z.enum(ALLOWED_SCOPES)).min(1),
  starts_at: z.string().optional(),
  expires_at: z.string().optional(),
  message: z.string().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const grants = await findMany('permission_grants', {
      where: [{ field: 'owner_user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(grants)
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Grants the CALLER has accepted (they are the recipient) — the "shared with me"
// side. MUST be declared before GET /:id, or `/received` matches the :id route.
router.get('/received', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const grants = await findMany<Record<string, unknown>>('permission_grants', {
      where: [
        { field: 'recipient_user_id', operator: '=', value: userId },
        { field: 'revoked_at', operator: '=', value: null },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    // Resolve each grant's owner display name for the recipient's view.
    const withOwners = await Promise.all(
      grants.map(async (g) => {
        const owner = await findById<{ name?: string; email?: string }>(
          'users',
          String(g.owner_user_id),
        )
        return {
          ...g,
          scope: safeParseScope(g.scope),
          owner_name: owner?.name?.trim() || owner?.email?.split('@')[0] || 'A patient',
        }
      }),
    )
    res.json(withOwners)
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const grant = await findById<Record<string, unknown>>('permission_grants', id)
    if (!grant || grant.owner_user_id !== userId) {
      return res.status(404).json({
        error: t('sharing.notFound', undefined, { defaultValue: 'Permission grant not found.' }),
      })
    }
    res.json(grant)
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof createSchema>
    const token = randomBytes(24).toString('hex')
    const result = await create('permission_grants', {
      owner_user_id: userId,
      recipient_email: body.recipient_email,
      recipient_user_id: null,
      recipient_name: body.recipient_name ?? null,
      role: body.role,
      scope: JSON.stringify(body.scope),
      starts_at: body.starts_at ? new Date(body.starts_at) : new Date(),
      expires_at: body.expires_at ? new Date(body.expires_at) : null,
      revoked_at: null,
      message: body.message ?? null,
      token,
      created_at: new Date(),
    })

    // Fire off the actual invitation email — without this, the recipient
    // never learns of the grant and "Send invitation" silently does nothing.
    // We never block grant creation on email delivery: the row is the source
    // of truth, the email is a notification courtesy.
    let emailMessageId: string | undefined = undefined
    let emailError: string | undefined = undefined
    if (hasTransport()) {
      try {
        const owner = await findById<{ name?: string; email?: string }>('users', userId)
        const ownerName = owner?.name?.trim() || owner?.email?.split('@')[0] || 'A patient'
        const fromAddress =
          process.env.EMAIL_FROM ||
          `Health Records <postmaster@${process.env.MAILGUN_DOMAIN ?? 'mailgun.test'}>`
        const appUrl = (process.env.SITE_ORIGIN || 'http://localhost:3000').replace(/\/$/, '')
        const acceptUrl = `${appUrl}/sharing/accept?token=${encodeURIComponent(token)}`
        const scopeList = body.scope.join(', ')
        const sendResult = await sendMail({
          from: fromAddress,
          to: body.recipient_email,
          subject: t(
            'sharing.invite.subject',
            { ownerName },
            { defaultValue: `${ownerName} shared their health records with you` },
          ),
          text: t(
            'sharing.invite.text',
            { ownerName, scopeList, acceptUrl, message: body.message ?? '' },
            {
              defaultValue:
                `Hi,\n\n${ownerName} has invited you to view their ${scopeList} as a "${body.role}".\n\n` +
                `Open the secure link to accept:\n${acceptUrl}\n\n` +
                (body.message ? `Personal note: ${body.message}\n\n` : '') +
                'You can revoke or download the records any time.\n',
            },
          ),
          html:
            `<p>Hi,</p>` +
            `<p><strong>${escapeHtml(ownerName)}</strong> has invited you to view their <em>${escapeHtml(scopeList)}</em> as a "<strong>${escapeHtml(body.role)}</strong>".</p>` +
            `<p><a href="${escapeHtml(acceptUrl)}">Open the secure link</a> to accept.</p>` +
            (body.message ? `<p><em>Personal note:</em> ${escapeHtml(body.message)}</p>` : '') +
            `<p style="color:#666;font-size:12px">If you weren't expecting this, you can safely ignore the message.</p>`,
        })
        emailMessageId = sendResult.messageId
      } catch (mailError) {
        emailError = mailError instanceof Error ? mailError.message : String(mailError)
      }
    } else {
      emailError = 'Email transport not configured — recipient was not notified.'
    }

    const created = (result as { data?: Record<string, unknown> }).data ?? result
    res.status(201).json({
      ...(created as Record<string, unknown>),
      email: {
        sent: Boolean(emailMessageId),
        messageId: emailMessageId ?? null,
        error: emailError ?? null,
      },
    })
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

// Claim a grant via the emailed token — the "accept invitation" step. The token
// (24 random bytes) IS the credential: the recipient proves they received the
// invite by presenting it. Binds the grant to the accepting (authenticated) user.
router.post('/accept', validateBody(acceptSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const { token } = req.body as z.infer<typeof acceptSchema>
    const matches = await findMany<Record<string, unknown>>('permission_grants', {
      where: [{ field: 'token', operator: '=', value: token }],
      limit: 1,
    })
    const grant = matches[0]
    // 404 (not 403) on a bad/unknown token so a caller can't probe valid tokens.
    if (!grant) {
      return res.status(404).json({
        error: t('sharing.invalidToken', undefined, {
          defaultValue: 'This invitation link is invalid.',
        }),
      })
    }
    if (grant.revoked_at) {
      return res.status(410).json({
        error: t('sharing.revoked', undefined, { defaultValue: 'This invitation was revoked.' }),
      })
    }
    if (grant.expires_at && new Date(String(grant.expires_at)) < new Date()) {
      return res.status(410).json({
        error: t('sharing.expired', undefined, { defaultValue: 'This invitation has expired.' }),
      })
    }
    // Already claimed by someone else → conflict; by the same user → idempotent success.
    if (grant.recipient_user_id && grant.recipient_user_id !== userId) {
      return res.status(409).json({
        error: t('sharing.alreadyClaimed', undefined, {
          defaultValue: 'This invitation was already accepted by another account.',
        }),
      })
    }
    if (!grant.recipient_user_id) {
      await updateById('permission_grants', String(grant.id), {
        recipient_user_id: userId,
        updatedAt: new Date(),
      })
    }
    const owner = await findById<{ name?: string; email?: string }>(
      'users',
      String(grant.owner_user_id),
    )
    res.json({
      id: grant.id,
      role: grant.role,
      scope: safeParseScope(grant.scope),
      owner_name: owner?.name?.trim() || owner?.email?.split('@')[0] || 'A patient',
    })
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.post('/:id/revoke', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('permission_grants', id)
    if (!existing || existing.owner_user_id !== userId) {
      return res.status(404).json({
        error: t('sharing.notFound', undefined, { defaultValue: 'Permission grant not found.' }),
      })
    }
    const result = await updateById('permission_grants', id, {
      revoked_at: new Date(),
      updatedAt: new Date(),
    })
    res.json((result as { data?: Record<string, unknown> }).data ?? result)
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('permission_grants', id)
    if (!existing || existing.owner_user_id !== userId) {
      return res.status(404).json({
        error: t('sharing.notFound', undefined, { defaultValue: 'Permission grant not found.' }),
      })
    }
    await deleteById('permission_grants', id)
    res.status(204).end()
  } catch (error) {
    logger.error('sharing.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
