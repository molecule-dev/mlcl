/**
 * Overview handler — the Dashboard aggregate in one fetch.
 *
 * Returns who is on call right now (per schedule, from materialized
 * shifts), open-incident counts by status/severity, pages + MTTR over the
 * last 7 days, a 14-day incidents-per-day series for the sparkline, and
 * the latest ack/resolve activity. The first GET also seeds the demo
 * workspace (every other handler's list endpoint re-checks idempotently).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { findCurrentOncall, loadRoster } from './_roster.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const DAY_MS = 24 * 60 * 60_000

interface IncidentRow {
  id: string
  severity: string
  status: string
  title: string
  service: string
  triggered_at: string
  acked_at: string | null
  resolved_at: string | null
  schedule_id: string | null
  assigned_member_id: string | null
}

interface EventRow {
  id: string
  incident_id: string
  kind: string
  actor: string
  text: string
  at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)

  const roster = await loadRoster(userId)

  // On-call now, per schedule.
  const schedules = await findMany<{
    id: string
    name: string
    rotation_type: string
    handoff_time: string
  }>('schedules', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 50,
  })
  const oncallNow = []
  for (const schedule of schedules) {
    const slot = await findCurrentOncall(userId, schedule.id, roster)
    oncallNow.push({
      schedule_id: schedule.id,
      schedule_name: schedule.name,
      rotation_type: schedule.rotation_type,
      handoff_time: schedule.handoff_time,
      oncall: slot,
    })
  }

  const incidents = await findMany<IncidentRow>('incidents', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'triggered_at', direction: 'desc' }],
    limit: 500,
  })

  const now = Date.now()
  const weekAgo = now - 7 * DAY_MS
  const counts = { open: 0, triggered: 0, acknowledged: 0, critical_open: 0, resolved_7d: 0 }
  const bySeverity = { critical: 0, warning: 0, info: 0 }
  for (const incident of incidents) {
    if (incident.status === 'resolved') {
      if (new Date(incident.resolved_at ?? incident.triggered_at).getTime() >= weekAgo) {
        counts.resolved_7d += 1
      }
    } else {
      counts.open += 1
      if (incident.status === 'triggered') counts.triggered += 1
      if (incident.status === 'acknowledged') counts.acknowledged += 1
      if (incident.severity === 'critical') counts.critical_open += 1
      const sev = incident.severity as keyof typeof bySeverity
      if (sev in bySeverity) bySeverity[sev] += 1
    }
  }

  // 14-day incidents-per-day series (by trigger day) for the sparkline.
  const series = new Array<number>(14).fill(0)
  for (const incident of incidents) {
    const ageDays = Math.floor((now - new Date(incident.triggered_at).getTime()) / DAY_MS)
    if (ageDays >= 0 && ageDays < 14) series[13 - ageDays] += 1
  }

  // Pages (trigger events) in the last 24h + MTTR over resolved incidents.
  const triggerEvents = await findMany<EventRow>('incident_events', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'kind', operator: '=', value: 'trigger' },
    ],
    orderBy: [{ field: 'at', direction: 'desc' }],
    limit: 200,
  })
  const pages_24h = triggerEvents.filter((e) => new Date(e.at).getTime() >= now - DAY_MS).length

  const resolved = incidents.filter(
    (i) => i.status === 'resolved' && i.resolved_at && new Date(i.resolved_at).getTime() >= weekAgo,
  )
  const mttrMinutes =
    resolved.length === 0
      ? 0
      : Math.round(
          resolved.reduce(
            (acc, i) =>
              acc +
              (new Date(i.resolved_at!).getTime() - new Date(i.triggered_at).getTime()) / 60_000,
            0,
          ) / resolved.length,
        )

  // Recent ack/resolve activity feed (latest 6).
  const activity = await findMany<EventRow>('incident_events', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'at', direction: 'desc' }],
    limit: 100,
  })
  const incidentById = new Map(incidents.map((i) => [i.id, i]))
  const recent_activity = activity
    .filter((e) => e.kind === 'ack' || e.kind === 'resolve')
    .slice(0, 6)
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      actor: e.actor,
      text: e.text,
      at: e.at,
      incident_id: e.incident_id,
      incident_title: incidentById.get(e.incident_id)?.title ?? '',
      incident_severity: incidentById.get(e.incident_id)?.severity ?? 'info',
    }))

  res.json({
    oncall_now: oncallNow,
    counts,
    by_severity: bySeverity,
    incidents_per_day: series,
    pages_24h: Number(pages_24h),
    mttr_minutes: mttrMinutes,
    recent_activity,
  })
})

export default router
