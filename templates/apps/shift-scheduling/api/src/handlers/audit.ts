/**
 * Audit feed surfaced on Settings.
 *
 * Reads from the `audit_events` table (written by the mutation handlers via
 * `recordAudit()` — e.g. staff.ts on create/update/delete, with the full
 * before/after snapshot) plus a synthesised feed derived from recent CRUD
 * activity so the UI still shows something for tables not yet audited. Every
 * entry is shaped into the `AuditEntry` view shape the frontend renders.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { buildLookups } from './_decorate.js'
import { ensureSeeded } from './_seed.js'

const router = Router()

interface RawAuditRow {
  id: string
  user_id: string
  actor_id: string | null
  table_name: string
  record_id: string | null
  action: string
  before: unknown
  after: unknown
  occurred_at: string
}

interface SyntheticRow {
  id: string
  table_name: string
  record_id: string | null
  action: string
  occurred_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  await ensureSeeded(userId)

  const lookups = await buildLookups(userId)
  const userName = lookups.decoratedStaff[0]?.name ?? 'You'
  const userInitial = userName?.[0]?.toUpperCase() ?? 'U'

  const rows = await findMany<RawAuditRow>('audit_events', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    limit: 50,
  }).catch(() => [] as RawAuditRow[])

  // Synthesize a fallback timeline from the most recent rows when the
  // audit table is sparse — this keeps the Settings → recent changes
  // section meaningful for a brand-new tenant. Real edits flow through
  // the audit-database bond on top of these synthetic rows.
  const synth: SyntheticRow[] = []
  const staff = await findMany<{
    id: string
    first_name: string
    last_name: string
    updated_at: string
    created_at: string
  }>('staff', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 5,
  })
  for (const s of staff) {
    const ts = String(s.updated_at ?? s.created_at)
    synth.push({
      id: `synth-staff-${s.id}`,
      table_name: 'staff',
      record_id: String(s.id),
      action: 'updated',
      occurred_at: ts,
    })
  }
  const swaps = await findMany<{ id: string; status: string; updated_at: string }>(
    'swap_requests',
    {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 3,
    },
  )
  for (const s of swaps) {
    synth.push({
      id: `synth-swap-${s.id}`,
      table_name: 'swap_requests',
      record_id: String(s.id),
      action: s.status === 'pending' ? 'requested' : s.status,
      occurred_at: String(s.updated_at),
    })
  }
  const shiftRows = await findMany<{ id: string; published: boolean; updated_at: string }>(
    'shifts',
    {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 3,
    },
  )
  for (const s of shiftRows) {
    synth.push({
      id: `synth-shift-${s.id}`,
      table_name: 'shifts',
      record_id: String(s.id),
      action: s.published ? 'published' : 'updated',
      occurred_at: String(s.updated_at),
    })
  }

  const seen = new Set<string>()
  const merged: Array<{ source: 'audit' | 'synth'; raw: RawAuditRow | SyntheticRow }> = []
  for (const r of rows) {
    const key = `${r.table_name}-${r.record_id}-${r.action}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ source: 'audit', raw: r })
  }
  for (const s of synth) {
    const key = `${s.table_name}-${s.record_id}-${s.action}`
    if (seen.has(key)) continue
    seen.add(key)
    merged.push({ source: 'synth', raw: s })
  }
  merged.sort(
    (a, b) => new Date(b.raw.occurred_at).getTime() - new Date(a.raw.occurred_at).getTime(),
  )

  const entries = merged.slice(0, 25).map((row) => {
    const r = row.raw
    const target = describeTarget(r.table_name, r.record_id, lookups.decoratedStaff)
    return {
      id: String(r.id),
      occurred_at:
        typeof r.occurred_at === 'string' ? r.occurred_at : new Date(r.occurred_at).toISOString(),
      actor_name: userName,
      actor_initial: userInitial,
      action: actionVerb(r.action, r.table_name),
      target_label: target.label,
      target_link: target.link,
      details: detailsFor(r.table_name, r.action),
    }
  })

  res.json(entries)
})

function actionVerb(action: string, table: string): string {
  if (action === 'created' || action === 'create') return 'created'
  if (action === 'updated' || action === 'update') return 'updated'
  if (action === 'deleted' || action === 'delete') return 'deleted'
  if (action === 'published') return 'published'
  if (action === 'requested') return 'requested'
  if (action === 'approved') return 'approved'
  if (action === 'denied') return 'denied'
  return `${action} a ${friendlyTable(table)}`
}

function friendlyTable(table: string): string {
  switch (table) {
    case 'staff':
      return 'staff member'
    case 'shifts':
      return 'shift'
    case 'swap_requests':
      return 'swap request'
    case 'claims':
      return 'shift claim'
    case 'availabilities':
      return 'availability window'
    default:
      return 'record'
  }
}

function describeTarget(
  table: string,
  recordId: string | null,
  staff: { id: string; name: string }[],
): { label: string; link: string } {
  if (table === 'staff' && recordId) {
    const s = staff.find((e) => String(e.id) === String(recordId))
    return {
      label: s?.name ?? 'a staff member',
      link: '/staff',
    }
  }
  if (table === 'shifts' && recordId) return { label: 'a shift', link: `/shifts/${recordId}` }
  if (table === 'swap_requests') return { label: 'a swap request', link: '/swap-requests' }
  if (table === 'claims') return { label: 'an open-shift claim', link: '/open-shifts' }
  return { label: friendlyTable(table), link: '/settings' }
}

function detailsFor(table: string, action: string): string {
  if (table === 'staff' && action === 'updated') return 'Roster fields changed.'
  if (table === 'staff' && action === 'created') return 'Added to the roster.'
  if (table === 'shifts' && action === 'published') return 'A week went live for the team.'
  if (table === 'swap_requests' && action === 'approved') return 'Manager approved the request.'
  if (table === 'swap_requests' && action === 'denied') return 'Manager denied the request.'
  return ''
}

export default router
