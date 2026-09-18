export interface PlanInfo {
  name: string
  monthly_cents: number
  requests_quota: number
}

/**
 * Billing plans keyed by the user's stored `planKey` (defaults to free). Single source of truth for
 * both the plan's display info (Billing page) AND its enforced monthly request quota, so the number
 * shown to the user and the number enforced on the request path can't drift apart.
 */
export const PLAN_INFO: Record<string, PlanInfo> = {
  free: { name: 'Free', monthly_cents: 0, requests_quota: 1_000 },
  stripemonthly: { name: 'Pro', monthly_cents: 1500, requests_quota: 1_000_000 },
  stripeyearly: { name: 'Pro', monthly_cents: 1250, requests_quota: 1_000_000 },
  teammonthly: { name: 'Team', monthly_cents: 4900, requests_quota: 100_000_000 },
  teamyearly: { name: 'Team', monthly_cents: 4083, requests_quota: 100_000_000 },
  // Legacy aliases for hand-set values during smoke tests.
  pro: { name: 'Pro', monthly_cents: 1500, requests_quota: 1_000_000 },
  team: { name: 'Team', monthly_cents: 4900, requests_quota: 100_000_000 },
  enterprise: { name: 'Enterprise', monthly_cents: 49900, requests_quota: 100_000_000 },
}

/** The monthly request quota for a user's plan; unknown/absent keys fall back to the free plan. */
export function requestsQuotaForPlanKey(planKey: string | null | undefined): number {
  const key = (planKey ?? 'free').toLowerCase()
  return (PLAN_INFO[key] ?? PLAN_INFO.free).requests_quota
}
