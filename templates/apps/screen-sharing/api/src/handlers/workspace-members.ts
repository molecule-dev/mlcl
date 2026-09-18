/**
 * Workspace members handler — invite + list + role management.
 *
 * List/read requires workspace membership; modifications require admin
 * (owner or admin role).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireWorkspaceAdmin, requireWorkspaceMember } from '../lib/authz.js'

const inviteSchema = z.object({
  workspace_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['admin', 'member']).optional().default('member'),
})

const updateSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
})

const router = Router()

router.use(requireAuth)

router.get('/:workspaceId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireWorkspaceMember(req.params.workspaceId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('workspaces.notFound', undefined, { defaultValue: 'Workspace not found' }),
      })
      return
    }
    const members = await findMany('workspace_members', {
      where: [{ field: 'workspace_id', operator: '=', value: req.params.workspaceId }],
      orderBy: [{ field: 'joined_at', direction: 'asc' }],
    })
    res.json(members)
  } catch (error) {
    logger.error('members.list', error)
    res.status(500).json({
      error: t('members.listError', undefined, { defaultValue: 'Failed to list members' }),
    })
  }
})

router.post('/invite', async (req: Request, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireWorkspaceAdmin(parsed.data.workspace_id, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('workspaces.notFound', undefined, { defaultValue: 'Workspace not found' }),
      })
      return
    }
    const matches = await findMany<{ id: string }>('users', {
      where: [{ field: 'email', operator: '=', value: parsed.data.email }],
      limit: 1,
    })
    const invitee = matches[0]
    if (invitee?.id) {
      // Enforce the workspace seat_limit: invites created a member unconditionally, so the stored
      // per-workspace cap was never checked. Skip the check when re-inviting an existing member
      // (idempotent — the create below conflict-noops), otherwise reject once the workspace is full.
      const seatLimit = Number((check.row as Record<string, unknown>).seat_limit ?? 0)
      const alreadyMember =
        (await count('workspace_members', [
          { field: 'workspace_id', operator: '=', value: parsed.data.workspace_id },
          { field: 'user_id', operator: '=', value: invitee.id },
        ])) > 0
      if (!alreadyMember && seatLimit > 0) {
        const memberCount = await count('workspace_members', [
          { field: 'workspace_id', operator: '=', value: parsed.data.workspace_id },
        ])
        if (memberCount >= seatLimit) {
          res.status(403).json({
            error: t('members.seatLimitReached', undefined, {
              defaultValue: 'This workspace has reached its seat limit.',
            }),
          })
          return
        }
      }
      try {
        await create('workspace_members', {
          workspace_id: parsed.data.workspace_id,
          user_id: invitee.id,
          role: parsed.data.role,
          invited_by: userId,
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      } catch (_error) {
        // unique-conflict on re-invite is non-fatal — member already in workspace
      }
    }
    try {
      await sendMail({
        from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
        to: parsed.data.email,
        subject: t('members.inviteSubject', undefined, {
          defaultValue: "You're invited to a workspace",
        }),
        text: t(
          'members.inviteBody',
          { workspace: String(check.row.name ?? '') },
          {
            defaultValue: `You've been invited to join "${String(check.row.name ?? 'Workspace')}"`,
          },
        ),
      })
    } catch (_error) {
      // delivery failures non-fatal in test envs
      logger.warn('members.invite.email', String(_error))
    }
    res.status(201).json({ invited: true, email: parsed.data.email })
  } catch (error) {
    logger.error('members.invite', error)
    res.status(500).json({
      error: t('members.inviteError', undefined, { defaultValue: 'Failed to invite member' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const member = await findById<Record<string, unknown>>(
      'workspace_members',
      req.params.id as string,
    )
    if (!member) {
      res.status(404).json({
        error: t('members.notFound', undefined, { defaultValue: 'Member not found' }),
      })
      return
    }
    const check = await requireWorkspaceAdmin(String(member.workspace_id), userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('members.notFound', undefined, { defaultValue: 'Member not found' }),
      })
      return
    }
    const result = await updateById('workspace_members', req.params.id as string, {
      role: parsed.data.role,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('members.update', error)
    res.status(500).json({
      error: t('members.updateError', undefined, { defaultValue: 'Failed to update member' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const member = await findById<Record<string, unknown>>(
      'workspace_members',
      req.params.id as string,
    )
    if (!member) {
      res.status(404).json({
        error: t('members.notFound', undefined, { defaultValue: 'Member not found' }),
      })
      return
    }
    if (String(member.user_id) !== String(userId)) {
      const check = await requireWorkspaceAdmin(String(member.workspace_id), userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('members.notFound', undefined, { defaultValue: 'Member not found' }),
        })
        return
      }
    }
    await deleteById('workspace_members', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('members.remove', error)
    res.status(500).json({
      error: t('members.removeError', undefined, { defaultValue: 'Failed to remove member' }),
    })
  }
})

export default router
