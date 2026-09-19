/**
 * Per-user demo seeding for oncall-management (Klaxon).
 *
 * On a freshly-signed-up account this writes:
 *   - 5 responders with timezones + on-call stats
 *   - 3 rotation schedules (weekly primary, daily api, weekend cover) with
 *     materialized shifts spanning 2 periods back / forward, plus one
 *     holiday override — so "who is on call right now" is always answerable
 *   - 2 escalation policies with ordered rule ladders
 *   - 6 incidents across every severity/status combination, each with a full
 *     trigger/ack/resolve timeline
 *   - 2 postmortems with contributing factors + action items
 *   - 6 notifications (pages, acks, resolves) for the in-app paging feed
 *
 * The seed is idempotent: it checks for existing rows before inserting
 * and is safe to call multiple times.
 *
 * @module
 */

import crypto from 'node:crypto'

import { count, create } from '@molecule/api-database'

interface ResponderSeed {
  key: string
  name: string
  email: string
  role: 'owner' | 'admin' | 'responder' | 'viewer'
  timezone: string
  oncall: boolean
  member_status: 'active' | 'invited'
  assigned_incidents: number
  acked_30d: number
  resolved_30d: number
  last_active: string
}

const RESPONDER_SEEDS: ResponderSeed[] = [
  {
    key: 'riley',
    name: 'Riley Carter',
    email: 'riley@klaxon.dev',
    role: 'owner',
    timezone: 'America/New_York',
    oncall: true,
    member_status: 'active',
    assigned_incidents: 2,
    acked_30d: 31,
    resolved_30d: 28,
    last_active: '2m ago',
  },
  {
    key: 'morgan',
    name: 'Morgan Reyes',
    email: 'morgan@klaxon.dev',
    role: 'admin',
    timezone: 'America/New_York',
    oncall: false,
    member_status: 'active',
    assigned_incidents: 1,
    acked_30d: 26,
    resolved_30d: 19,
    last_active: 'just now',
  },
  {
    key: 'sasha',
    name: 'Sasha Lin',
    email: 'sasha@klaxon.dev',
    role: 'responder',
    timezone: 'Europe/Berlin',
    oncall: true,
    member_status: 'active',
    assigned_incidents: 1,
    acked_30d: 22,
    resolved_30d: 17,
    last_active: '3h ago',
  },
  {
    key: 'jordan',
    name: 'Jordan Park',
    email: 'jordan@klaxon.dev',
    role: 'responder',
    timezone: 'America/Los_Angeles',
    oncall: false,
    member_status: 'active',
    assigned_incidents: 0,
    acked_30d: 14,
    resolved_30d: 11,
    last_active: '35m ago',
  },
  {
    key: 'priya',
    name: 'Priya Patel',
    email: 'priya@klaxon.dev',
    role: 'viewer',
    timezone: 'Asia/Kolkata',
    oncall: false,
    member_status: 'invited',
    assigned_incidents: 0,
    acked_30d: 0,
    resolved_30d: 0,
    last_active: 'pending',
  },
]

interface ScheduleSeed {
  key: string
  name: string
  description: string
  timezone: string
  rotation_type: 'weekly' | 'daily'
  handoff_time: string
  member_keys: string[]
}

const SCHEDULE_SEEDS: ScheduleSeed[] = [
  {
    key: 'platform',
    name: 'Platform Primary',
    description: 'Main weekly rotation for customer-facing platform services.',
    timezone: 'America/New_York',
    rotation_type: 'weekly',
    handoff_time: '09:00',
    member_keys: ['riley', 'morgan', 'sasha', 'jordan'],
  },
  {
    key: 'api',
    name: 'API Services',
    description: 'Daily rotation covering the public API surface.',
    timezone: 'Europe/Berlin',
    rotation_type: 'daily',
    handoff_time: '10:00',
    member_keys: ['sasha', 'jordan'],
  },
  {
    key: 'weekend',
    name: 'Weekend Cover',
    description: 'Saturday handoff rotation for weekend coverage.',
    timezone: 'America/New_York',
    rotation_type: 'weekly',
    handoff_time: '00:00',
    member_keys: ['morgan', 'jordan'],
  },
]

interface PolicySeed {
  key: string
  name: string
  description: string
  repeat_cycles: number
  rules: Array<{
    member_key?: string
    channel?: string
    wait_minutes: number
  }>
}

const POLICY_SEEDS: PolicySeed[] = [
  {
    key: 'p1',
    name: 'Platform P1',
    description: 'Page the primary on-call, then the secondary, then the channel.',
    repeat_cycles: 2,
    rules: [
      { member_key: 'riley', wait_minutes: 0 },
      { member_key: 'morgan', wait_minutes: 15 },
      { channel: '#platform-incidents', wait_minutes: 15 },
    ],
  },
  {
    key: 'p2',
    name: 'Services P2',
    description: 'Slower ladder for services-tier incidents.',
    repeat_cycles: 1,
    rules: [
      { member_key: 'sasha', wait_minutes: 0 },
      { member_key: 'jordan', wait_minutes: 20 },
      { channel: 'ops@klaxon.dev', wait_minutes: 30 },
    ],
  },
]

interface IncidentSeed {
  key: string
  title: string
  description: string
  severity: 'critical' | 'warning' | 'info'
  status: 'triggered' | 'acknowledged' | 'resolved'
  service: string
  policy_key: string
  schedule_key: string
  paged_key: string
  assignee_key: string | null
  triggered_minutes_ago: number
  acked_minutes_ago: number | null
  resolved_minutes_ago: number | null
  escalation_level: number
  notes: string[]
}

const INCIDENT_SEEDS: IncidentSeed[] = [
  {
    key: 'checkout-down',
    title: 'Checkout API returning 503 for all requests',
    description: 'Error rate jumped to 100% on checkout-api after the 14:10 deploy.',
    severity: 'critical',
    status: 'triggered',
    service: 'checkout-api',
    policy_key: 'p1',
    schedule_key: 'platform',
    paged_key: 'riley',
    assignee_key: null,
    triggered_minutes_ago: 9,
    acked_minutes_ago: null,
    resolved_minutes_ago: null,
    escalation_level: 0,
    notes: ['Monitor confirmed 100% 5xx on /v2/checkout across all regions.'],
  },
  {
    key: 'payments-latency',
    title: 'Payment authorization latency above 4s',
    description: 'p95 authorization latency breached the 4s SLO for 25 minutes.',
    severity: 'critical',
    status: 'acknowledged',
    service: 'payments-web',
    policy_key: 'p1',
    schedule_key: 'platform',
    paged_key: 'morgan',
    assignee_key: 'morgan',
    triggered_minutes_ago: 75,
    acked_minutes_ago: 52,
    resolved_minutes_ago: null,
    escalation_level: 1,
    notes: [
      'Provider status page reports elevated latency in eu-west-1.',
      'Rolled back the router config change as a precaution; latency recovering.',
    ],
  },
  {
    key: 'search-degraded',
    title: 'Search relevance scores degraded',
    description: 'Indexing lag is pushing stale results into the top 10.',
    severity: 'warning',
    status: 'acknowledged',
    service: 'search-service',
    policy_key: 'p2',
    schedule_key: 'api',
    paged_key: 'sasha',
    assignee_key: 'sasha',
    triggered_minutes_ago: 190,
    acked_minutes_ago: 170,
    resolved_minutes_ago: null,
    escalation_level: 0,
    notes: ['Queue depth draining; monitoring until the backlog clears.'],
  },
  {
    key: 'auth-throttling',
    title: 'Login throttling misconfigured for SSO users',
    description: 'SSO logins were throttled after 2 attempts instead of 10.',
    severity: 'warning',
    status: 'resolved',
    service: 'auth-api',
    policy_key: 'p2',
    schedule_key: 'api',
    paged_key: 'jordan',
    assignee_key: 'jordan',
    triggered_minutes_ago: 26 * 60,
    acked_minutes_ago: 25 * 60,
    resolved_minutes_ago: 23 * 60,
    escalation_level: 0,
    notes: ['Config hotfixed; wrote a postmortem draft.'],
  },
  {
    key: 'ci-flake',
    title: 'Nightly CI suite flaking on integration tests',
    description: 'Intermittent container start timeouts on shared runners.',
    severity: 'info',
    status: 'resolved',
    service: 'ci-runner',
    policy_key: 'p2',
    schedule_key: 'weekend',
    paged_key: 'morgan',
    assignee_key: 'morgan',
    triggered_minutes_ago: 2 * 24 * 60,
    acked_minutes_ago: 2 * 24 * 60 - 20,
    resolved_minutes_ago: 2 * 24 * 60 - 90,
    escalation_level: 0,
    notes: ['Runner pool expanded; watching the next three nights.'],
  },
  {
    key: 'cart-outage',
    title: 'Cart service outage during flash sale',
    description: 'Connection pool exhaustion took the cart service down for 38 minutes.',
    severity: 'critical',
    status: 'resolved',
    service: 'checkout-api',
    policy_key: 'p1',
    schedule_key: 'platform',
    paged_key: 'riley',
    assignee_key: 'riley',
    triggered_minutes_ago: 6 * 24 * 60,
    acked_minutes_ago: 6 * 24 * 60 - 4,
    resolved_minutes_ago: 6 * 24 * 60 - 38,
    escalation_level: 2,
    notes: [
      'Escalated to layer 2 when ack slipped past 5 minutes.',
      'Pool exhaustion traced to a missing statement timeout.',
    ],
  },
]

interface PostmortemSeed {
  incident_key: string
  title: string
  summary: string
  contributing_factors: string[]
  status: 'draft' | 'published'
  action_items: Array<{
    description: string
    owner_key: string | null
    status: 'open' | 'in_progress' | 'done'
    due_in_days: number | null
  }>
}

const POSTMORTEM_SEEDS: PostmortemSeed[] = [
  {
    incident_key: 'cart-outage',
    title: 'Postmortem: cart service outage during flash sale',
    summary:
      'A flash-sale traffic spike exhausted the cart service database connection pool. The pool had no statement timeout, so a slow pricing query held connections until every worker starved. The incident ran 38 minutes: 4 to ack, 34 to roll back the pricing query and drain the pool.',
    contributing_factors: [
      'Pricing query shipped without a statement timeout',
      'Connection pool sized for normal traffic, not sale traffic',
      'No load test in CI for the flash-sale profile',
    ],
    status: 'published',
    action_items: [
      {
        description: 'Add a 5s statement timeout to every cart-service query',
        owner_key: 'riley',
        status: 'done',
        due_in_days: 7,
      },
      {
        description: 'Raise pool ceiling and add saturation alerting at 80%',
        owner_key: 'morgan',
        status: 'in_progress',
        due_in_days: 14,
      },
      {
        description: 'Add a flash-sale load profile to the CI pipeline',
        owner_key: 'jordan',
        status: 'open',
        due_in_days: 30,
      },
      {
        description: 'Document the pool-drain runbook step',
        owner_key: 'sasha',
        status: 'open',
        due_in_days: 21,
      },
    ],
  },
  {
    incident_key: 'auth-throttling',
    title: 'Postmortem: SSO login throttling misconfiguration',
    summary:
      'A config migration reset the SSO throttle window from 10 attempts to 2, locking out frequent SSO users for ~2 hours until the hotfix shipped.',
    contributing_factors: [
      'Throttle defaults lived in code, not in the config store',
      'Config migration lacked a regression test',
    ],
    status: 'draft',
    action_items: [
      {
        description: 'Move throttle defaults into the config store',
        owner_key: 'jordan',
        status: 'open',
        due_in_days: 14,
      },
      {
        description: 'Add a regression test covering config migrations',
        owner_key: 'sasha',
        status: 'open',
        due_in_days: 21,
      },
    ],
  },
]

interface NotificationSeed {
  kind: 'page' | 'ack' | 'resolve' | 'escalate' | 'system'
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  href_key: string | null
  read: boolean
  minutes_ago: number
}

const NOTIFICATION_SEEDS: NotificationSeed[] = [
  {
    kind: 'page',
    severity: 'critical',
    title: 'Page: checkout-api returning 503',
    detail: 'Paged Riley Carter (on call, Platform Primary) via Platform P1.',
    href_key: 'checkout-down',
    read: false,
    minutes_ago: 9,
  },
  {
    kind: 'ack',
    severity: 'info',
    title: 'Acknowledged: payment authorization latency',
    detail: 'Morgan Reyes acknowledged 23 minutes after the page.',
    href_key: 'payments-latency',
    read: false,
    minutes_ago: 52,
  },
  {
    kind: 'escalate',
    severity: 'warning',
    title: 'Escalated to layer 2: payment authorization latency',
    detail: 'No ack within 15 minutes — paged Morgan Reyes, then #platform-incidents.',
    href_key: 'payments-latency',
    read: false,
    minutes_ago: 40,
  },
  {
    kind: 'resolve',
    severity: 'info',
    title: 'Resolved: SSO login throttling',
    detail: 'Jordan Park resolved after 2h 10m.',
    href_key: 'auth-throttling',
    read: true,
    minutes_ago: 23 * 60,
  },
  {
    kind: 'page',
    severity: 'warning',
    title: 'Page: search relevance degraded',
    detail: 'Paged Sasha Lin (on call, API Services) via Services P2.',
    href_key: 'search-degraded',
    read: true,
    minutes_ago: 190,
  },
  {
    kind: 'system',
    severity: 'info',
    title: 'Welcome to Klaxon',
    detail: 'Rotations, escalation policies and paging are live for this workspace.',
    href_key: null,
    read: true,
    minutes_ago: 3 * 24 * 60,
  },
]

const seededUsers = new Set<string>()

const offsetMinutes = (minutes: number): Date => new Date(Date.now() - minutes * 60_000)

const offsetDays = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60_000)

export const MS_PER_DAY = 24 * 60 * 60_000
export const MS_PER_WEEK = 7 * MS_PER_DAY

/**
 * Most recent rotation boundary at or before `now` for a cadence.
 * Weekly boundaries land on Mondays; daily boundaries on the calendar day.
 * The handoff HH:MM is interpreted as UTC in V1 (schedule timezone stays
 * display metadata) — see schedules.ts materializeRotation for why.
 */
export const latestRotationBoundary = (
  rotationType: string,
  handoffTime: string,
  now: Date = new Date(),
): Date => {
  const parts = handoffTime.split(':').map((n) => Number.parseInt(n, 10))
  const h = Number.isFinite(parts[0]) ? parts[0]! : 0
  const m = Number.isFinite(parts[1]) ? parts[1]! : 0
  const candidate = new Date(now)
  candidate.setUTCHours(h, m, 0, 0)
  if (candidate.getTime() > now.getTime()) {
    candidate.setUTCDate(candidate.getUTCDate() - 1)
    if (rotationType !== 'daily') {
      candidate.setUTCDate(candidate.getUTCDate() - ((candidate.getUTCDay() + 6) % 7))
    }
    return candidate
  }
  if (rotationType === 'daily') return candidate
  // weekly: walk back to Monday
  const daysSinceMonday = (candidate.getUTCDay() + 6) % 7
  candidate.setUTCDate(candidate.getUTCDate() - daysSinceMonday)
  return candidate
}

export const seedDemoForUser = async (userId: string): Promise<void> => {
  if (seededUsers.has(userId)) return
  try {
    const existing = await count('incidents', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) return

    // 1. Responders.
    const memberIdByKey = new Map<string, string>()
    for (const r of RESPONDER_SEEDS) {
      const created = await create<{ id: string }>('team_members', {
        user_id: userId,
        member_id: crypto.randomUUID(),
        name: r.name,
        email: r.email,
        role: r.role,
        timezone: r.timezone,
        oncall: r.oncall,
        member_status: r.member_status,
        assigned_incidents: r.assigned_incidents,
        acked_30d: r.acked_30d,
        resolved_30d: r.resolved_30d,
        last_active: r.last_active,
        active: r.member_status === 'active',
        created_at: offsetMinutes(30 * 24 * 60),
      })
      if (created.data?.id) memberIdByKey.set(r.key, created.data.id)
    }

    // 2. Schedules + materialized shifts (2 periods back, ~4 rounds forward).
    const scheduleIdByKey = new Map<string, string>()
    const now = new Date()
    for (const s of SCHEDULE_SEEDS) {
      const members = s.member_keys
        .map((k) => memberIdByKey.get(k))
        .filter((v): v is string => Boolean(v))
      const created = await create<{ id: string }>('schedules', {
        user_id: userId,
        name: s.name,
        description: s.description,
        timezone: s.timezone,
        rotation_type: s.rotation_type,
        handoff_time: s.handoff_time,
        members: JSON.stringify(members),
        is_active: true,
        created_at: offsetMinutes(60 * 24 * 60),
        updated_at: offsetMinutes(60),
      })
      const scheduleId = created.data?.id
      if (!scheduleId) continue
      scheduleIdByKey.set(s.key, scheduleId)

      const periodMs = s.rotation_type === 'daily' ? MS_PER_DAY : MS_PER_WEEK
      const boundary = latestRotationBoundary(s.rotation_type, s.handoff_time, now)
      // Start two periods back so past coverage renders on the calendar.
      const start = new Date(boundary.getTime() - 2 * periodMs)
      const rounds = 4
      const shiftCount = Math.max(members.length, 1) * rounds
      for (let i = 0; i < shiftCount; i++) {
        const shiftStart = new Date(start.getTime() + i * periodMs)
        const shiftEnd = new Date(shiftStart.getTime() + periodMs)
        const memberId = members[i % members.length]
        if (!memberId) break
        await create('schedule_shifts', {
          user_id: userId,
          schedule_id: scheduleId,
          member_id: memberId,
          start_at: shiftStart,
          end_at: shiftEnd,
          is_override: false,
          note: null,
          created_at: offsetMinutes(60 * 24 * 60),
        })
      }

      // Weekend cover gets one holiday override next Saturday so the
      // calendar demonstrates the override affordance.
      if (s.key === 'weekend') {
        const nextWeek = new Date(now.getTime() + 7 * MS_PER_DAY)
        const daysToSat = (6 - nextWeek.getUTCDay() + 7) % 7
        const sat = new Date(nextWeek)
        sat.setUTCDate(sat.getUTCDate() + daysToSat)
        sat.setUTCHours(0, 0, 0, 0)
        await create('schedule_shifts', {
          user_id: userId,
          schedule_id: scheduleId,
          member_id: memberIdByKey.get('riley') ?? members[0] ?? '',
          start_at: sat,
          end_at: new Date(sat.getTime() + MS_PER_DAY),
          is_override: true,
          note: 'Holiday cover override',
          created_at: offsetMinutes(60),
        })
      }
    }

    // 3. Escalation policies + rule ladders.
    const policyIdByKey = new Map<string, string>()
    for (const p of POLICY_SEEDS) {
      const created = await create<{ id: string }>('escalation_policies', {
        user_id: userId,
        name: p.name,
        description: p.description,
        repeat_cycles: p.repeat_cycles,
        is_active: true,
        created_at: offsetMinutes(60 * 24 * 60),
        updated_at: offsetMinutes(60),
      })
      const policyId = created.data?.id
      if (!policyId) continue
      policyIdByKey.set(p.key, policyId)
      for (let i = 0; i < p.rules.length; i++) {
        const rule = p.rules[i]!
        await create('escalation_rules', {
          user_id: userId,
          policy_id: policyId,
          position: i,
          notify_member_id: rule.member_key ? (memberIdByKey.get(rule.member_key) ?? null) : null,
          notify_channel: rule.channel ?? null,
          wait_minutes: rule.wait_minutes,
          created_at: offsetMinutes(60 * 24 * 60),
        })
      }
    }

    // 4. Incidents + timeline events.
    const incidentIdByKey = new Map<string, string>()
    const responderName = (key: string | null | undefined): string => {
      if (!key) return 'on-call'
      return RESPONDER_SEEDS.find((r) => r.key === key)?.name ?? 'on-call'
    }
    for (const seed of INCIDENT_SEEDS) {
      const triggeredAt = offsetMinutes(seed.triggered_minutes_ago)
      const assigneeId = seed.assignee_key ? (memberIdByKey.get(seed.assignee_key) ?? null) : null
      const created = await create<{ id: string }>('incidents', {
        user_id: userId,
        title: seed.title,
        description: seed.description,
        severity: seed.severity,
        status: seed.status,
        service: seed.service,
        assigned_member_id: assigneeId,
        escalation_policy_id: policyIdByKey.get(seed.policy_key) ?? null,
        schedule_id: scheduleIdByKey.get(seed.schedule_key) ?? null,
        escalation_level: seed.escalation_level,
        triggered_at: triggeredAt,
        acked_at: seed.acked_minutes_ago !== null ? offsetMinutes(seed.acked_minutes_ago) : null,
        resolved_at:
          seed.resolved_minutes_ago !== null ? offsetMinutes(seed.resolved_minutes_ago) : null,
        created_at: triggeredAt,
        updated_at: offsetMinutes(
          seed.resolved_minutes_ago ?? seed.acked_minutes_ago ?? seed.triggered_minutes_ago,
        ),
      })
      const incidentId = created.data?.id
      if (!incidentId) continue
      incidentIdByKey.set(seed.key, incidentId)

      const policyName = POLICY_SEEDS.find((p) => p.key === seed.policy_key)?.name ?? 'policy'
      await create('incident_events', {
        user_id: userId,
        incident_id: incidentId,
        kind: 'trigger',
        actor: 'monitor',
        text: `Triggered on ${seed.service} — paged ${responderName(seed.paged_key)} via ${policyName}.`,
        at: triggeredAt,
        created_at: triggeredAt,
      })
      if (seed.escalation_level > 0) {
        const escAt = offsetMinutes(seed.triggered_minutes_ago - 15)
        await create('incident_events', {
          user_id: userId,
          incident_id: incidentId,
          kind: 'escalate',
          actor: 'system',
          text: `No ack — escalated to layer ${seed.escalation_level}.`,
          at: escAt,
          created_at: escAt,
        })
      }
      if (seed.acked_minutes_ago !== null) {
        const ackedAt = offsetMinutes(seed.acked_minutes_ago)
        await create('incident_events', {
          user_id: userId,
          incident_id: incidentId,
          kind: 'ack',
          actor: responderName(seed.assignee_key),
          text: `Acknowledged ${Math.max(
            0,
            seed.triggered_minutes_ago - seed.acked_minutes_ago,
          )} minutes after the page.`,
          at: ackedAt,
          created_at: ackedAt,
        })
      }
      for (const note of seed.notes) {
        const noteAt = offsetMinutes(
          Math.max(
            1,
            (seed.resolved_minutes_ago ?? seed.acked_minutes_ago ?? seed.triggered_minutes_ago) - 5,
          ),
        )
        await create('incident_events', {
          user_id: userId,
          incident_id: incidentId,
          kind: 'note',
          actor: responderName(seed.assignee_key),
          text: note,
          at: noteAt,
          created_at: noteAt,
        })
      }
      if (seed.resolved_minutes_ago !== null) {
        const resolvedAt = offsetMinutes(seed.resolved_minutes_ago)
        await create('incident_events', {
          user_id: userId,
          incident_id: incidentId,
          kind: 'resolve',
          actor: responderName(seed.assignee_key),
          text: `Resolved — total incident duration ${
            seed.triggered_minutes_ago - seed.resolved_minutes_ago
          } minutes.`,
          at: resolvedAt,
          created_at: resolvedAt,
        })
      }
    }

    // 5. Postmortems + action items. jsonb columns are JSON.stringify'd
    // because the pg driver auto-detects JS arrays as text[] not jsonb.
    for (const pm of POSTMORTEM_SEEDS) {
      const incidentId = incidentIdByKey.get(pm.incident_key)
      if (!incidentId) continue
      const created = await create<{ id: string }>('postmortems', {
        user_id: userId,
        incident_id: incidentId,
        title: pm.title,
        summary: pm.summary,
        contributing_factors: JSON.stringify(pm.contributing_factors),
        status: pm.status,
        created_at: offsetMinutes(5 * 24 * 60),
        updated_at: offsetMinutes(2 * 24 * 60),
      })
      const postmortemId = created.data?.id
      if (!postmortemId) continue
      for (const item of pm.action_items) {
        await create('postmortem_action_items', {
          user_id: userId,
          postmortem_id: postmortemId,
          description: item.description,
          owner_member_id: item.owner_key ? (memberIdByKey.get(item.owner_key) ?? null) : null,
          status: item.status,
          due_at: item.due_in_days !== null ? offsetDays(item.due_in_days) : null,
          created_at: offsetMinutes(5 * 24 * 60),
          updated_at: offsetMinutes(60),
        })
      }
    }

    // 6. Notifications — page/ack/escalate/resolve feed with hrefs patched
    // to the real incident ids so the bell deep-links work.
    for (const n of NOTIFICATION_SEEDS) {
      const href = n.href_key ? `/incidents/${incidentIdByKey.get(n.href_key) ?? ''}` : '/schedules'
      await create('notifications', {
        user_id: userId,
        kind: n.kind,
        severity: n.severity,
        title: n.title,
        detail: n.detail,
        href,
        read: n.read,
        created_at: offsetMinutes(n.minutes_ago),
      })
    }
    seededUsers.add(userId)
  } catch (err) {
    // Seed is best-effort but we surface failures so an agent can debug.
    console.error('[seed] seedDemoForUser failed:', err)
  }
}
