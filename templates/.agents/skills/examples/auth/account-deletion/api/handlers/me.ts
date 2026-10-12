import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { deleteMany, findById, updateById } from '@molecule/api-database'
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

  // Sign the user out everywhere by deleting their device sessions — BEFORE the
  // soft-delete marker, deliberately. These two writes have no transaction
  // across them, so a failure between them decides which PARTIAL state the
  // caller is left in, and the order decides which partial state is reachable:
  //
  // - marker first (the old order): a failed purge left `deleted_at` SET — the
  //   30-day hard-delete clock running — while every session stayed live and
  //   the 500 told the user "it failed". The worst combination: the one write
  //   that is hard to see from the outside had happened, and the security
  //   purpose of the request (a stolen device signed out) was defeated while
  //   the UI said nothing happened.
  // - purge first: a failed marker leaves the sessions signed out and the
  //   account still active. The 500 is then TRUE ("it failed"), the state is
  //   the safe direction (a retry re-runs both writes; deleteMany is
  //   WHERE-based, so devices created since are caught too), and the user who
  //   was signing in again finds the deletion refused rather than running.
  //
  // Molecule is JWT/device-token based — there is no req.session; each active
  // session is a row in `devices`.
  //
  // ONE round-trip, not findMany + a per-row deleteById: the loop paid one query
  // per device (a user with many sessions made the delete request wait on one
  // sequential round-trip per row), and it removed only the rows the read happened
  // to see — a device created between that read and the last delete survived the
  // sign-out. The WHERE-based delete removes every row that matches when it runs.
  // The same shape the nightly finalize-deletions job purges sessions with (see
  // jobs/finalize-deletions.ts).
  await deleteMany('devices', [{ field: 'userId', operator: '=', value: userId }])

  await updateById('users', userId, {
    deleted_at: new Date().toISOString(),
    deletion_requested_by: userId,
  })

  // Audit-log this; users have a right to evidence of their own deletion.
  // (Audit log table is shipped from compound/audit-log/.)
  // await logAudit({ actorUserId: userId, actionType: 'account_deletion_requested', subjectTable: 'users', subjectId: userId })

  res.json({ ok: true, scheduled: 'hard delete in 30 days' })
})

export default router
