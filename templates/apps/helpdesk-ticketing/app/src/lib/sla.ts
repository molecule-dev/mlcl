export interface SlaPolicyLike {
  priority?: string | null
  resolution_hours?: number | null
  active?: boolean | null
}

export interface SlaTicketLike {
  priority?: string | null
  status?: string | null
  created_at?: string | null
  createdAt?: string | null
  updated_at?: string | null
  updatedAt?: string | null
}

export interface SlaCompliance {
  /** Tickets whose priority has an active policy (the denominator). */
  total: number
  compliant: number
  breached: number
  /** Still-open tickets already past their resolution target. */
  overdue: number
  /** compliant / total, rounded; 100 when there is nothing to measure. */
  compliancePct: number
}

const RESOLVED_STATUSES = new Set(['resolved', 'closed', 'solved'])

function elapsedHours(startIso: string, endMs: number): number {
  const start = new Date(startIso).getTime()
  if (Number.isNaN(start)) return 0
  return (endMs - start) / 3_600_000
}

/**
 * Resolution-SLA compliance from the stored per-priority policies and ticket timestamps.
 *
 * The SLA policies store a `resolution_hours` target per priority, but the compliance figure was
 * computed off phantom fields (always 0) or a hardcoded fallback. Here each ticket is matched to its
 * priority's active policy and judged against the target: a resolved/closed ticket measures
 * created→updated (updated_at is the best available resolution time — there is no resolved_at
 * column), a still-open ticket measures created→now. `overdue` counts open tickets already over
 * target. Tickets whose priority has no active policy are excluded. Pure, so it is unit-testable.
 *
 * (The policies' separate `first_response_hours` target needs per-reply timestamps and is not wired
 * here — tracked as follow-up.)
 */
export function computeSlaCompliance(
  tickets: SlaTicketLike[],
  policies: SlaPolicyLike[],
  now: number,
): SlaCompliance {
  const targetByPriority = new Map<string, number>()
  for (const policy of policies) {
    if (policy.active === false) continue
    const key = String(policy.priority ?? '').toLowerCase()
    const hours = Number(policy.resolution_hours)
    if (!key || !Number.isFinite(hours) || hours <= 0) continue
    if (!targetByPriority.has(key)) targetByPriority.set(key, hours)
  }

  let total = 0
  let compliant = 0
  let overdue = 0
  for (const ticket of tickets) {
    const key = String(ticket.priority ?? '').toLowerCase()
    const target = targetByPriority.get(key)
    if (target === undefined) continue
    const created = ticket.created_at ?? ticket.createdAt
    if (!created) continue
    total += 1
    const resolved = RESOLVED_STATUSES.has(String(ticket.status ?? '').toLowerCase())
    let endMs = now
    if (resolved) {
      const resolvedAt = new Date(ticket.updated_at ?? ticket.updatedAt ?? created).getTime()
      endMs = Number.isNaN(resolvedAt) ? now : resolvedAt
    }
    if (elapsedHours(created, endMs) <= target) compliant += 1
    else if (!resolved) overdue += 1
  }

  const breached = total - compliant
  const compliancePct = total > 0 ? Math.round((compliant / total) * 100) : 100
  return { total, compliant, breached, overdue, compliancePct }
}
