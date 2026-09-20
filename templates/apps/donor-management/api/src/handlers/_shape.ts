/**
 * donor-management — DB-row → FE-shape transformers.
 *
 * The frontend pages render a fixture-shaped payload (see
 * api/fixtures/*.json). The Postgres schema stores normalized rows
 * (gifts, receipt_items, notes as separate tables), so these helpers fold
 * a row plus joined lookups (donor name, campaign name) back into the flat
 * shape the pages expect.
 *
 * Pure functions; no I/O. Joining is handled by the caller fetching the
 * related rows once and passing them in as lookup maps.
 *
 * Money is integer cents everywhere. Dates are ISO strings; `gift_date`
 * and campaign dates are plain calendar dates (YYYY-MM-DD).
 */

export type Row = Record<string, unknown>

export function asMap<T extends Row>(rows: readonly T[], key: keyof T): Map<string, T> {
  const m = new Map<string, T>()
  for (const r of rows) {
    const k = r[key]
    if (typeof k === 'string') m.set(k, r)
  }
  return m
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' ? v : v == null ? fallback : String(v)

const iso = (v: unknown, fallback = ''): string => {
  if (v == null) return fallback
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') {
    const t = Date.parse(v)
    if (!Number.isNaN(t)) return new Date(t).toISOString()
    return v
  }
  return fallback
}

/** Calendar date (YYYY-MM-DD) — no timezone shifting for gift_date etc. */
const day = (v: unknown, fallback = ''): string => {
  if (v == null) return fallback
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'string') return v.slice(0, 10)
  return fallback
}

const bool = (v: unknown, fallback = false): boolean =>
  typeof v === 'boolean' ? v : v == null ? fallback : Boolean(v)

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []

export interface ShapedDonor {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  is_organization: boolean
  tags: string[]
  created_at: string
  /** Lifetime giving in cents — supplied by the caller from the gifts table. */
  lifetime_cents: number
  gift_count: number
  first_gifted_at: string | null
  last_gift_at: string | null
}

export function shapeDonor(d: Row, stats?: DonorStats): ShapedDonor {
  return {
    id: str(d.id),
    name: str(d.name),
    email: d.email ? str(d.email) : null,
    phone: d.phone ? str(d.phone) : null,
    address: d.address ? str(d.address) : null,
    is_organization: bool(d.is_organization),
    tags: strList(d.tags),
    created_at: iso(d.created_at),
    lifetime_cents: stats?.lifetimeCents ?? 0,
    gift_count: stats?.giftCount ?? 0,
    first_gifted_at: stats?.firstGiftedAt ? day(stats.firstGiftedAt) : null,
    last_gift_at: stats?.lastGiftAt ? day(stats.lastGiftAt) : null,
  }
}

export interface DonorStats {
  lifetimeCents: number
  giftCount: number
  firstGiftedAt: string | Date | null
  lastGiftAt: string | Date | null
}

export interface ShapedCampaign {
  id: string
  name: string
  description: string
  goal_cents: number
  starts_on: string | null
  ends_on: string | null
  status: string
  created_at: string
  /** Raised to date in cents — derived from gifts, supplied by the caller. */
  raised_cents: number
  gift_count: number
}

export function shapeCampaign(c: Row, raisedCents = 0, giftCount = 0): ShapedCampaign {
  return {
    id: str(c.id),
    name: str(c.name),
    description: str(c.description),
    goal_cents: num(c.goal_cents),
    starts_on: c.starts_on ? day(c.starts_on) : null,
    ends_on: c.ends_on ? day(c.ends_on) : null,
    status: str(c.status, 'active'),
    created_at: iso(c.created_at),
    raised_cents: raisedCents,
    gift_count: giftCount,
  }
}

export interface ShapedGift {
  id: string
  donor_id: string
  donor_name: string
  amount_cents: number
  gift_date: string
  method: string
  fund: string
  campaign_id: string | null
  campaign_name: string | null
  receipt_id: string | null
  /** Derived receipted flag — a gift is receipted once a receipt references it. */
  receipted: boolean
  note: string
  created_at: string
}

export function shapeGift(g: Row, donorName = '', campaignName: string | null = null): ShapedGift {
  const receiptId = g.receipt_id ? str(g.receipt_id) : null
  return {
    id: str(g.id),
    donor_id: str(g.donor_id),
    donor_name: donorName,
    amount_cents: num(g.amount_cents),
    gift_date: day(g.gift_date),
    method: str(g.method, 'card'),
    fund: str(g.fund, 'general'),
    campaign_id: g.campaign_id ? str(g.campaign_id) : null,
    campaign_name: campaignName,
    receipt_id: receiptId,
    receipted: receiptId !== null,
    note: str(g.note),
    created_at: iso(g.created_at),
  }
}

export interface ShapedReceipt {
  id: string
  donor_id: string
  donor_name: string
  year: number
  receipt_number: string
  total_cents: number
  issued_at: string
}

export function shapeReceipt(r: Row, donorName = ''): ShapedReceipt {
  return {
    id: str(r.id),
    donor_id: str(r.donor_id),
    donor_name: donorName,
    year: num(r.year),
    receipt_number: str(r.receipt_number),
    total_cents: num(r.total_cents),
    issued_at: iso(r.issued_at),
  }
}

export interface ShapedReceiptItem {
  id: string
  gift_id: string
  gift_date: string
  amount_cents: number
  fund: string
  method: string
}

export function shapeReceiptItem(item: Row, gift?: Row | null): ShapedReceiptItem {
  return {
    id: str(item.id),
    gift_id: str(item.gift_id),
    gift_date: gift ? day(gift.gift_date) : '',
    amount_cents: num(item.amount_cents),
    fund: gift ? str(gift.fund, 'general') : 'general',
    method: gift ? str(gift.method, 'card') : 'card',
  }
}

export interface ShapedNote {
  id: string
  donor_id: string
  author: string
  body: string
  created_at: string
}

export function shapeNote(n: Row): ShapedNote {
  return {
    id: str(n.id),
    donor_id: str(n.donor_id),
    author: str(n.author),
    body: str(n.body),
    created_at: iso(n.created_at),
  }
}
