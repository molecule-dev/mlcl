/**
 * Incidents handler — the trigger → page → ack → resolve workflow.
 *
 * "Paging" is deliberately IN-APP ONLY: POST / creates the incident, a
 * `trigger` timeline event, and a `page` notification row addressed to the
 * current on-call responder (resolved from the incident's schedule shifts,
 * else the escalation policy's first rule, else the first active roster
 * member). No SMS/Slack/etc — fully deterministic and testable.
 *
 * State machine: triggered → acknowledged → resolved. Transitions are
 * guarded (409 on invalid moves); reopen returns a resolved incident to
 * `triggered`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { findCurrentOncall, firstResponder, loadRoster } from './_roster.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const SEVERITIES = ['critical', 'warning', 'info'] as const
const STATUSES = ['triggered', 'acknowledged', 'resolved'] as const

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  severity: z.enum(SEVERITIES).optional(),
  service: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const triggerSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(4000).optional(),
  severity: z.enum(SEVERITIES).optional(),
  service: z.string().min(1).max(200),
  escalation_policy_id: z.string().uuid().nullable().optional(),
  schedule_id: z.string().uuid().nullable().optional(),
})

const assignSchema = z.object({
  member_id: z.string().uuid().nullable().optional(),
})

const noteSchema = z.object({
  text: z.string().min(1).max(4000),
  actor: z.string().max(200).optional(),
})

const escalateSchema = z.object({
  actor: z.string().max(200).optional(),
})

const ackSchema = z.object({
  actor: z.string().max(200).optional(),
})

const resolveSchema = z.object({
  actor: z.string().max(200).optional(),
  note: z.string().max(4000).optional(),
})

interface IncidentRow {
  id: string
  user_id: string
  title: string
  description: string
  severity: string
  status: string
  service: string
  assigned_member_id: string | null
  escalation_policy_id: string | null
  schedule_id: string | null
  escalation_level: number
  triggered_at: string
  acked_at: string | null
  resolved_at: string | null
}

const loadOwnedIncident = async (userId: string, id: string): Promise<IncidentRow | null> => {
  const row = await findById<IncidentRow>('incidents', id)
  if (!row || row.user_id !== userId) return null
  return row
}

/**
 * Resolve names for the incident's FK graph (assignee, policy, schedule)
 * plus the current on-call — one roster fetch, reused by list + detail.
 */
const projectIncident = async (
  incident: IncidentRow,
  roster: Map<string, { name: string }>,
): Promise<Record<string, unknown>> => {
  let escalation_policy_name: string | null = null
  if (incident.escalation_policy_id) {
    const policy = await findById<{ name: string }>(
      'escalation_policies',
      incident.escalation_policy_id,
    )
    escalation_policy_name = policy?.name ?? null
  }
  let schedule_name: string | null = null
  if (incident.schedule_id) {
    const schedule = await findById<{ name: string }>('schedules', incident.schedule_id)
    schedule_name = schedule?.name ?? null
  }
  return {
    ...incident,
    escalation_level: Number(incident.escalation_level ?? 0),
    assignee: incident.assigned_member_id
      ? (roster.get(incident.assigned_member_id)?.name ?? null)
      : null,
    escalation_policy_name,
    schedule_name,
  }
}

const appendEvent = async (
  userId: string,
  incidentId: string,
  kind: 'trigger' | 'ack' | 'resolve' | 'note' | 'escalate' | 'assign',
  actor: string,
  text: string,
): Promise<void> => {
  await create('incident_events', {
    user_id: userId,
    incident_id: incidentId,
    kind,
    actor,
    text,
    at: new Date(),
    created_at: new Date(),
  })
}

const pushNotification = async (
  userId: string,
  incident: IncidentRow,
  kind: 'page' | 'ack' | 'resolve' | 'escalate',
  title: string,
  detail: string,
): Promise<void> => {
  await create('notifications', {
    user_id: userId,
    kind,
    severity: incident.severity,
    title,
    detail,
    href: `/incidents/${incident.id}`,
    read: false,
    created_at: new Date(),
  })
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  if (req.query.severity) {
    where.push({ field: 'severity', operator: '=', value: String(req.query.severity) })
  }
  if (req.query.service) {
    where.push({ field: 'service', operator: '=', value: String(req.query.service) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 200
  const incidents = await findMany<IncidentRow>('incidents', {
    where,
    orderBy: [{ field: 'triggered_at', direction: 'desc' }],
    limit,
  })
  const roster = await loadRoster(userId)
  const projected = []
  for (const incident of incidents) {
    projected.push(await projectIncident(incident, roster))
  }
  res.json(projected)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const events = await findMany('incident_events', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'incident_id', operator: '=', value: id },
    ],
    orderBy: [{ field: 'at', direction: 'asc' }],
    limit: 200,
  })
  const roster = await loadRoster(userId)
  const postmortem = await findMany<{ id: string }>('postmortems', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'incident_id', operator: '=', value: id },
    ],
    limit: 1,
  })
  res.json({
    ...(await projectIncident(incident, roster)),
    events,
    postmortem_id: postmortem[0]?.id ?? null,
  })
})

/**
 * Trigger a new incident + page the on-call responder (in-app).
 * Page-target precedence: current on-call of the incident's schedule →
 * first rule member of the escalation policy → first active responder.
 */
router.post('/', validateBody(triggerSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof triggerSchema>

  const roster = await loadRoster(userId)
  let pagedName = 'on-call'
  let pagedVia = 'direct page'

  // 1. Current on-call from the schedule rotation.
  const oncall = await findCurrentOncall(userId, body.schedule_id ?? null, roster)
  if (oncall) {
    pagedName = oncall.name
    if (body.schedule_id) {
      const schedule = await findById<{ name: string }>('schedules', body.schedule_id)
      if (schedule) pagedVia = `on call, ${schedule.name}`
    }
  } else if (body.escalation_policy_id) {
    // 2. First rule of the escalation ladder that names a member.
    const rules = await findMany<{
      notify_member_id: string | null
      notify_channel: string | null
      position: number
      wait_minutes: number
    }>('escalation_rules', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'policy_id', operator: '=', value: body.escalation_policy_id },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 20,
    })
    const policy = await findById<{ name: string }>(
      'escalation_policies',
      body.escalation_policy_id,
    )
    const firstMemberRule = rules.find((r) => r.notify_member_id)
    if (firstMemberRule?.notify_member_id) {
      pagedName = roster.get(firstMemberRule.notify_member_id)?.name ?? 'on-call'
    } else if (rules[0]?.notify_channel) {
      pagedName = rules[0].notify_channel
    }
    if (policy) pagedVia = policy.name
  } else {
    // 3. First active responder.
    const fallback = await firstResponder(userId)
    if (fallback) pagedName = roster.get(fallback.id)?.name ?? fallback.name
  }

  const now = new Date()
  const created = await create<IncidentRow>('incidents', {
    user_id: userId,
    title: body.title,
    description: body.description ?? '',
    severity: body.severity ?? 'warning',
    status: 'triggered',
    service: body.service,
    assigned_member_id: null,
    escalation_policy_id: body.escalation_policy_id ?? null,
    schedule_id: body.schedule_id ?? null,
    escalation_level: 0,
    triggered_at: now,
    acked_at: null,
    resolved_at: null,
    created_at: now,
    updated_at: now,
  })
  const incident = created.data
  if (!incident) {
    return res.status(500).json({
      error: t('incidents.createFailed', {}, { defaultValue: 'Could not create incident' }),
    })
  }

  await appendEvent(
    userId,
    String(incident.id),
    'trigger',
    'monitor',
    `Triggered on ${body.service} — paged ${pagedName} via ${pagedVia}.`,
  )
  await pushNotification(
    userId,
    incident,
    'page',
    `Page: ${body.title}`,
    `Paged ${pagedName} (${pagedVia}).`,
  )

  res.status(201).json(await projectIncident(incident, roster))
})

router.put('/:id/ack', validateBody(ackSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  if (incident.status !== 'triggered') {
    return res.status(409).json({
      error: t(
        'incidents.invalidTransition',
        { status: incident.status },
        { defaultValue: 'Only a triggered incident can be acknowledged (current: {{status}})' },
      ),
    })
  }
  const actor = (req.body as z.infer<typeof ackSchema>).actor ?? 'You'
  const now = new Date()
  const result = await updateById<IncidentRow>('incidents', id, {
    status: 'acknowledged',
    acked_at: now,
    updated_at: now,
  })
  const ackMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(incident.triggered_at).getTime()) / 60_000),
  )
  await appendEvent(userId, id, 'ack', actor, `Acknowledged ${ackMinutes} minutes after the page.`)
  const updated = result.data ?? incident
  await pushNotification(
    userId,
    { ...incident, status: 'acknowledged' },
    'ack',
    `Acknowledged: ${incident.title}`,
    `${actor} acknowledged ${ackMinutes} minutes after the page.`,
  )
  const roster = await loadRoster(userId)
  res.json(await projectIncident(updated, roster))
})

router.put('/:id/resolve', validateBody(resolveSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  if (incident.status === 'resolved') {
    return res.status(409).json({
      error: t('incidents.alreadyResolved', {}, { defaultValue: 'Incident is already resolved' }),
    })
  }
  const body = req.body as z.infer<typeof resolveSchema>
  const actor = body.actor ?? 'You'
  const now = new Date()
  const result = await updateById<IncidentRow>('incidents', id, {
    status: 'resolved',
    resolved_at: now,
    updated_at: now,
  })
  const durationMinutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(incident.triggered_at).getTime()) / 60_000),
  )
  await appendEvent(
    userId,
    id,
    'resolve',
    actor,
    body.note
      ? `Resolved — ${body.note}`
      : `Resolved — total incident duration ${durationMinutes} minutes.`,
  )
  const updated = result.data ?? incident
  await pushNotification(
    userId,
    { ...incident, status: 'resolved' },
    'resolve',
    `Resolved: ${incident.title}`,
    `${actor} resolved after ${durationMinutes} minutes.`,
  )
  const roster = await loadRoster(userId)
  res.json(await projectIncident(updated, roster))
})

router.put('/:id/reopen', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  if (incident.status !== 'resolved') {
    return res.status(409).json({
      error: t('incidents.notResolved', {}, { defaultValue: 'Only resolved incidents can reopen' }),
    })
  }
  const now = new Date()
  const result = await updateById<IncidentRow>('incidents', id, {
    status: 'triggered',
    acked_at: null,
    resolved_at: null,
    escalation_level: 0,
    triggered_at: now,
    updated_at: now,
  })
  await appendEvent(
    userId,
    id,
    'trigger',
    'monitor',
    `Reopened — paged the on-call responder again.`,
  )
  await pushNotification(
    userId,
    { ...incident, status: 'triggered' },
    'page',
    `Page: ${incident.title} (reopened)`,
    'Reopened — paged the on-call responder again.',
  )
  const roster = await loadRoster(userId)
  res.json(await projectIncident(result.data ?? incident, roster))
})

/**
 * Escalate: walk the linked policy's rule ladder one position. Cycles are
 * bounded by repeat_cycles; past the bound the incident stays at the last
 * layer and the event says so (deterministic, testable without a clock).
 */
router.put('/:id/escalate', validateBody(escalateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  if (incident.status === 'resolved') {
    return res.status(409).json({
      error: t(
        'incidents.cannotEscalateResolved',
        {},
        { defaultValue: 'Resolved incidents cannot escalate' },
      ),
    })
  }
  const roster = await loadRoster(userId)
  const policyId = incident.escalation_policy_id
  if (!policyId) {
    return res.status(409).json({
      error: t(
        'incidents.noPolicy',
        {},
        { defaultValue: 'Incident has no escalation policy linked' },
      ),
    })
  }
  const policy = await findById<{ name: string; repeat_cycles: number }>(
    'escalation_policies',
    policyId,
  )
  const rules = await findMany<{
    notify_member_id: string | null
    notify_channel: string | null
    position: number
  }>('escalation_rules', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'policy_id', operator: '=', value: policyId },
    ],
    orderBy: [{ field: 'position', direction: 'asc' }],
    limit: 20,
  })
  if (rules.length === 0) {
    return res.status(409).json({
      error: t('policies.noRules', {}, { defaultValue: 'Policy has no rules to escalate through' }),
    })
  }
  const currentLevel = Number(incident.escalation_level ?? 0)
  const maxLevel = rules.length * Math.max(1, policy?.repeat_cycles ?? 1)
  const nextLevel = currentLevel + 1
  if (nextLevel > maxLevel) {
    return res.status(409).json({
      error: t(
        'policies.escalationExhausted',
        { max: String(maxLevel) },
        { defaultValue: 'Escalation ladder exhausted after {{max}} layers' },
      ),
    })
  }
  const rule = rules[(nextLevel - 1) % rules.length]!
  const target = rule.notify_member_id
    ? (roster.get(rule.notify_member_id)?.name ?? 'responder')
    : (rule.notify_channel ?? 'channel')
  const actor = (req.body as z.infer<typeof escalateSchema>).actor ?? 'system'
  const now = new Date()
  const result = await updateById<IncidentRow>('incidents', id, {
    escalation_level: nextLevel,
    updated_at: now,
  })
  await appendEvent(
    userId,
    id,
    'escalate',
    actor,
    `Escalated to layer ${nextLevel} — paged ${target} via ${policy?.name ?? 'policy'}.`,
  )
  await pushNotification(
    userId,
    incident,
    'escalate',
    `Escalated to layer ${nextLevel}: ${incident.title}`,
    `Paged ${target} via ${policy?.name ?? 'policy'}.`,
  )
  res.json(await projectIncident(result.data ?? incident, roster))
})

router.put('/:id/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const body = req.body as z.infer<typeof assignSchema>
  const roster = await loadRoster(userId)
  const memberId = body.member_id ?? null
  if (memberId && !roster.has(memberId)) {
    return res.status(404).json({
      error: t('team.notFound', {}, { defaultValue: 'Member not found' }),
    })
  }
  const result = await updateById<IncidentRow>('incidents', id, {
    assigned_member_id: memberId,
    updated_at: new Date(),
  })
  const name = memberId ? (roster.get(memberId)?.name ?? 'responder') : null
  await appendEvent(userId, id, 'assign', 'You', name ? `Assigned to ${name}.` : 'Unassigned.')
  res.json(await projectIncident(result.data ?? incident, roster))
})

router.post('/:id/notes', validateBody(noteSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const body = req.body as z.infer<typeof noteSchema>
  await appendEvent(userId, id, 'note', body.actor ?? 'You', body.text)
  const events = await findMany('incident_events', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'incident_id', operator: '=', value: id },
    ],
    orderBy: [{ field: 'at', direction: 'asc' }],
    limit: 200,
  })
  res.status(201).json(events)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req)
  const incident = await loadOwnedIncident(userId, id)
  if (!incident) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  await deleteById('incidents', id)
  res.status(204).end()
})

export default router
