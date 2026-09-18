/**
 * Projection helpers that hydrate database rows into the shape the
 * frontend expects. Backend handlers store raw rows; the frontend
 * needs derived/joined fields (creator name, backer count, progress,
 * days left, hot tier counts, etc.) for rendering.
 *
 * @module
 */

import { findById, findMany } from '@molecule/api-database'

export interface CampaignRow {
  id: string
  creator_id: string
  title: string
  description: string
  goal_amount: number | string
  raised_amount: number | string
  start_date: string | Date | null
  end_date: string | Date
  status: string
  category: string
  cover_image_url: string | null
  featured: boolean
  created_at: string | Date
  updated_at: string | Date
}

export interface DecoratedCampaign extends Omit<CampaignRow, 'goal_amount' | 'raised_amount'> {
  goal_amount: number
  raised_amount: number
  goal_cents: number
  pledged_cents: number
  creator_name: string
  creator_initial: string
  backer_count: number
  progress: number
  days_left: number
}

export interface DecoratedTier {
  id: string
  campaign_id: string
  title: string
  description: string
  amount: number
  price_cents: number
  max_backers: number | null
  current_backers: number
  estimated_delivery: string | null
  remaining: number | null
  created_at: string | Date
  updated_at: string | Date
}

export interface DecoratedPledge {
  id: string
  campaign_id: string
  campaign_title: string
  campaign_status: string
  campaign_category: string
  campaign_pledged_cents: number
  campaign_goal_cents: number
  tier_id: string | null
  tier_title: string | null
  amount: number
  amount_cents: number
  status: string
  payment_id: string | null
  fulfillment_status: 'preparing' | 'shipped' | 'delivered' | 'pending' | 'refunded'
  pledged_at: string
  created_at: string | Date
  updated_at: string | Date
}

function toNumber(v: unknown): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function daysFromNow(d: string | Date): number {
  const t = new Date(d).getTime()
  if (!Number.isFinite(t)) return 0
  return Math.max(0, Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24)))
}

function progressPct(raised: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(999, Math.round((raised / goal) * 100))
}

export async function decorateCampaign(
  row: CampaignRow,
  opts?: { backerCount?: number },
): Promise<DecoratedCampaign> {
  const goal = toNumber(row.goal_amount)
  const raised = toNumber(row.raised_amount)
  let creatorName = 'Anonymous Creator'
  if (row.creator_id) {
    const creator = await findById<Record<string, unknown>>('users', row.creator_id)
    if (creator?.name) creatorName = String(creator.name)
    else if (creator?.email) creatorName = String(creator.email).split('@')[0]
  }
  const backerCount = opts?.backerCount ?? (await countActiveBackers(row.id))
  return {
    ...row,
    goal_amount: goal,
    raised_amount: raised,
    goal_cents: Math.round(goal * 100),
    pledged_cents: Math.round(raised * 100),
    creator_name: creatorName,
    creator_initial: creatorName.charAt(0).toUpperCase() || 'A',
    backer_count: backerCount,
    progress: progressPct(raised, goal),
    days_left: daysFromNow(row.end_date),
  }
}

export async function countActiveBackers(campaignId: string): Promise<number> {
  const pledges = await findMany<Record<string, unknown>>('pledges', {
    where: [
      { field: 'campaign_id', operator: '=', value: campaignId },
      { field: 'status', operator: '=', value: 'active' },
    ],
  })
  return new Set(pledges.map((p) => String(p.backer_id))).size
}

export function decorateTier(row: Record<string, unknown>): DecoratedTier {
  const amount = toNumber(row.amount)
  const max = row.max_backers != null ? toNumber(row.max_backers) : null
  const current = toNumber(row.current_backers)
  return {
    id: String(row.id),
    campaign_id: String(row.campaign_id),
    title: String(row.title),
    description: String(row.description ?? ''),
    amount,
    price_cents: Math.round(amount * 100),
    max_backers: max,
    current_backers: current,
    estimated_delivery: row.estimated_delivery ? String(row.estimated_delivery) : null,
    remaining: max != null ? Math.max(0, max - current) : null,
    created_at: row.created_at as string | Date,
    updated_at: row.updated_at as string | Date,
  }
}

export async function decoratePledge(
  row: Record<string, unknown>,
  campaignCache?: Map<string, CampaignRow | null>,
): Promise<DecoratedPledge> {
  const campaignId = String(row.campaign_id)
  let campaign: CampaignRow | null
  if (campaignCache && campaignCache.has(campaignId)) {
    campaign = campaignCache.get(campaignId) ?? null
  } else {
    campaign = (await findById<CampaignRow>('campaigns', campaignId)) ?? null
    if (campaignCache) campaignCache.set(campaignId, campaign)
  }
  let tierTitle: string | null = null
  if (row.tier_id) {
    const tier = await findById<Record<string, unknown>>('reward_tiers', String(row.tier_id))
    if (tier?.title) tierTitle = String(tier.title)
  }
  const amount = toNumber(row.amount)
  return {
    id: String(row.id),
    campaign_id: campaignId,
    campaign_title: campaign?.title ?? 'Unknown campaign',
    campaign_status: campaign?.status ?? 'unknown',
    campaign_category: campaign?.category ?? 'general',
    campaign_pledged_cents: Math.round(toNumber(campaign?.raised_amount) * 100),
    campaign_goal_cents: Math.round(toNumber(campaign?.goal_amount) * 100),
    tier_id: row.tier_id ? String(row.tier_id) : null,
    tier_title: tierTitle,
    amount,
    amount_cents: Math.round(amount * 100),
    status: String(row.status ?? 'active'),
    payment_id: row.payment_id ? String(row.payment_id) : null,
    fulfillment_status: derivePledgeFulfillmentStatus(
      String(row.status ?? 'active'),
      campaign?.status ?? '',
    ),
    pledged_at: row.created_at
      ? new Date(row.created_at as string | Date).toISOString()
      : new Date().toISOString(),
    created_at: row.created_at as string | Date,
    updated_at: row.updated_at as string | Date,
  }
}

function derivePledgeFulfillmentStatus(
  pledgeStatus: string,
  campaignStatus: string,
): DecoratedPledge['fulfillment_status'] {
  if (pledgeStatus === 'refunded') return 'refunded'
  if (pledgeStatus === 'fulfilled') return 'delivered'
  if (campaignStatus === 'funded') return 'preparing'
  return 'pending'
}
