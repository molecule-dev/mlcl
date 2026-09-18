import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const deleteSchema = z.object({
  confirm_email: z.string().email(),
})

// SCHEMA: this stores soft-delete state in NEW columns on the framework `users` table.
// `users` already EXISTS, so the "missing migration" verifier (which flags missing TABLES
// only) will NOT remind you — add these columns or the delete 500s:
//   ALTER TABLE users ADD COLUMN deleted_at text;
//   ALTER TABLE users ADD COLUMN deletion_requested_by text;
// Every read path that lists/returns users must then also filter `deleted_at IS NULL`.
const router = Router()

// The confirmation UI reads back the signed-in user's own email to check what
// they type before enabling Delete — serve it. Returns ONLY email (never spread
// the row: it would leak secrets-table-adjacent fields).
router.get('/', requireAuth, async (_req, res) => {
  const userId = res.locals.session.userId as string
  const user = (await findById('users', userId)) as { id: string; email: string } | null
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })
  res.json({ email: user.email })
})

// Soft-delete. Hard-delete + cascade runs as a daily cron job (see
// jobs/finalize-deletions.ts).
router.delete('/', requireAuth, async (req, res) => {
  const userId = res.locals.session.userId as string
  const user = (await findById('users', userId)) as { id: string; email: string } | null
  if (!user)
    return res
      .status(404)
      .json({ error: t('me.notFound', undefined, { defaultValue: 'User not found' }) })

  // Confirmation gate: require the user's own email back as a safety net.
  const parsed = deleteSchema.safeParse(req.body)
  if (!parsed.success || parsed.data.confirm_email.toLowerCase() !== user.email.toLowerCase()) {
    return res.status(400).json({
      error: t('account.confirmEmail', undefined, { defaultValue: 'Type your email to confirm' }),
    })
  }

  await updateById('users', userId, {
    deleted_at: new Date().toISOString(),
    deletion_requested_by: userId,
  })

  // Audit-log this; users have a right to evidence of their own deletion.
  // (Audit log table is shipped from compound/audit-log/.)
  // await logAudit({ actorUserId: userId, actionType: 'account_deletion_requested', subjectTable: 'users', subjectId: userId })

  // Sign the user out everywhere by deleting their device sessions. Molecule is
  // JWT/device-token based — there is no req.session; each active session is a row
  // in `devices`.
  const devices = await findMany<{ id: string }>('devices', {
    where: [{ field: 'userId', operator: '=', value: userId }],
  })
  for (const device of devices) {
    await deleteById('devices', device.id)
  }
  res.json({ ok: true, scheduled: 'hard delete in 30 days' })
})

export default router
