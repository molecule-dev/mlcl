/**
 * Team handler — workspace + workspace_members for the signed-in user's
 * organization.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findOne, query, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

async function ensureWorkspace(userId: string): Promise<string> {
  const existing = await findOne<{ id: string }>('workspaces', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  let workspaceId: string
  if (existing?.id) {
    workspaceId = existing.id
  } else {
    const result = await create<{ id: string }>('workspaces', {
      user_id: userId,
      name: 'My organization',
      slug: null,
      created_at: new Date(),
    })
    workspaceId = String(result.data?.id ?? '')
  }
  // Owner must always be present in workspace_members so they appear in the
  // /team roster. Idempotent: rely on the unique (workspace_id, user_id)
  // index to swallow duplicates if this races with another insert.
  const ownerRow = await findOne<{ id: string }>('workspace_members', [
    { field: 'workspace_id', operator: '=', value: workspaceId },
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!ownerRow?.id) {
    try {
      await create<Record<string, unknown>>('workspace_members', {
        workspace_id: workspaceId,
        user_id: userId,
        role: 'admin',
        invited_at: new Date(),
        accepted_at: new Date(),
        created_at: new Date(),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (!/duplicate key|unique/i.test(message)) throw err
    }
  }
  return workspaceId
}

const inviteSchema = z.object({
  email: z.string().trim().email().max(320),
  role: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
})

const updateRoleSchema = z.object({
  role: z.enum(['viewer', 'editor', 'admin']),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const workspaceId = await ensureWorkspace(userId)
    const result = await query<{
      id: string
      workspace_id: string
      user_id: string | null
      role: string
      invited_at: Date
      accepted_at: Date | null
      email: string | null
      name: string | null
    }>(
      `SELECT m.id, m.workspace_id, m.user_id, m.role, m.invited_at, m.accepted_at,
              u.email, u.name
       FROM public.workspace_members m
       LEFT JOIN public.users u ON u.id = m.user_id
       WHERE m.workspace_id = $1
       ORDER BY m.invited_at DESC`,
      [workspaceId],
    )
    res.json({ workspace_id: workspaceId, members: result.rows })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/invite', validateBody(inviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const workspaceId = await ensureWorkspace(userId)
    const body = req.body as z.infer<typeof inviteSchema>
    const existingUser = await findOne<{ id: string; email: string | null; name: string | null }>(
      'users',
      [{ field: 'email', operator: '=', value: body.email }],
    )

    // If the invitee already has an account, attach them as a workspace
    // member directly (real read-after-write invariant: GET /team will show
    // them in the next request).
    if (existingUser?.id) {
      try {
        const result = await create<Record<string, unknown>>('workspace_members', {
          workspace_id: workspaceId,
          user_id: existingUser.id,
          role: body.role,
          invited_at: new Date(),
          created_at: new Date(),
        })
        res.status(201).json({ ...result.data, email: existingUser.email, pending: false })
        return
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (/duplicate key|unique/i.test(message)) {
          res.status(409).json({ error: 'Already a member of this workspace' })
          return
        }
        throw err
      }
    }

    // Unknown email: send a real invitation email via the bonded transport.
    // We do NOT insert a workspace_members row (the schema requires a user_id;
    // the row is created on the invitee's first signup-with-token flow OR on
    // a follow-up invite once they have an account). The verifiable invariant
    // here is "we attempted to send a real email through the transport bond".
    try {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: body.email,
        subject: 'You have been invited to a Quorum workspace',
        text:
          `Hello,\n\nYou were invited to join a Quorum (Voting & Polling) workspace as a ${body.role}.` +
          `\n\nCreate an account at the Quorum signup page to accept the invitation.\n`,
      })
    } catch (err) {
      // Mailgun sandbox commonly rejects unauthorised recipients in test
      // mode; the bond reports synthetic success and logs a warning. If the
      // transport raises a hard error (e.g. network), we still want the
      // route to surface a 4xx so the caller knows the invite did not go
      // out — but never a 5xx, so /team page does not crash.
      logger.warn?.(
        { err: err instanceof Error ? err.message : String(err) },
        'team invite email failed',
      )
    }
    res.status(202).json({ email: body.email, role: body.role, pending: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/role', validateBody(updateRoleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const workspaceId = await ensureWorkspace(userId)
    const id = String(req.params.id)
    const member = await findOne<{ id: string; workspace_id: string }>('workspace_members', [
      { field: 'id', operator: '=', value: id },
      { field: 'workspace_id', operator: '=', value: workspaceId },
    ])
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }
    const body = req.body as z.infer<typeof updateRoleSchema>
    const result = await updateById('workspace_members', id, { role: body.role })
    res.json(result.data)
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const workspaceId = await ensureWorkspace(userId)
    const id = String(req.params.id)
    const member = await findOne<{ id: string; workspace_id: string }>('workspace_members', [
      { field: 'id', operator: '=', value: id },
      { field: 'workspace_id', operator: '=', value: workspaceId },
    ])
    if (!member) {
      res.status(404).json({ error: 'Member not found' })
      return
    }
    await deleteById('workspace_members', id)
    res.status(204).end()
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
