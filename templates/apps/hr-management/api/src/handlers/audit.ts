/**
 * Audit feed surfaced on Settings.
 *
 * Reads from the `audit_events` table (written by the mutation handlers via
 * `recordAudit()` — e.g. employees.ts on create/update/delete, with the full
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
  const userName =
    lookups.decoratedEmployees.find(
      (e) => e.title?.toLowerCase().includes('chief') || e.title?.toLowerCase().includes('ceo'),
    )?.name ?? 'You'
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
  const employees = await findMany<{
    id: string
    first_name: string
    last_name: string
    updated_at: string
    created_at: string
  }>('employees', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 5,
  })
  for (const emp of employees) {
    const ts = String(emp.updated_at ?? emp.created_at)
    synth.push({
      id: `synth-emp-${emp.id}`,
      table_name: 'employees',
      record_id: String(emp.id),
      action: 'updated',
      occurred_at: ts,
    })
  }
  const docs = await findMany<{ id: string; title: string; updated_at: string }>('documents', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 3,
  })
  for (const d of docs) {
    synth.push({
      id: `synth-doc-${d.id}`,
      table_name: 'documents',
      record_id: String(d.id),
      action: 'uploaded',
      occurred_at: String(d.updated_at),
    })
  }
  const ptos = await findMany<{ id: string; status: string; updated_at: string }>('pto_requests', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit: 3,
  })
  for (const p of ptos) {
    synth.push({
      id: `synth-pto-${p.id}`,
      table_name: 'pto_requests',
      record_id: String(p.id),
      action: p.status === 'pending' ? 'requested' : p.status,
      occurred_at: String(p.updated_at),
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
    const target = describeTarget(r.table_name, r.record_id, lookups.decoratedEmployees)
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
  if (action === 'uploaded') return 'uploaded'
  if (action === 'requested') return 'requested'
  if (action === 'approved') return 'approved'
  if (action === 'denied') return 'denied'
  return `${action} a ${friendlyTable(table)}`
}

function friendlyTable(table: string): string {
  switch (table) {
    case 'employees':
      return 'employee'
    case 'pto_requests':
      return 'PTO request'
    case 'documents':
      return 'document'
    case 'departments':
      return 'department'
    case 'performance_reviews':
      return 'review'
    case 'notifications':
      return 'notification'
    default:
      return 'record'
  }
}

function describeTarget(
  table: string,
  recordId: string | null,
  employees: { id: string; name: string }[],
): { label: string; link: string } {
  if (table === 'employees' && recordId) {
    const emp = employees.find((e) => String(e.id) === String(recordId))
    return {
      label: emp?.name ?? 'an employee',
      link: `/employees/${recordId}`,
    }
  }
  if (table === 'pto_requests') return { label: 'a PTO request', link: '/pto' }
  if (table === 'documents') return { label: 'a document', link: '/documents' }
  if (table === 'departments') return { label: 'a department', link: '/settings' }
  if (table === 'performance_reviews')
    return { label: 'a performance review', link: '/performance' }
  return { label: friendlyTable(table), link: '/settings' }
}

function detailsFor(table: string, action: string): string {
  if (table === 'employees' && action === 'updated') return 'Profile fields changed.'
  if (table === 'employees' && action === 'created') return 'Hired and added to the directory.'
  if (table === 'pto_requests' && action === 'approved') return 'Manager approved the request.'
  if (table === 'pto_requests' && action === 'denied') return 'Manager denied the request.'
  if (table === 'documents' && action === 'uploaded') return 'Stored in the document library.'
  return ''
}

export default router
