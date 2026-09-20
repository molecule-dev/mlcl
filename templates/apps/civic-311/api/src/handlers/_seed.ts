/**
 * Demo seed for civic-311 (CivicPulse — the fictional City of Riverton).
 *
 * Seeding runs in two layers, both idempotent (guarded by row-count checks
 * so server restarts never double-seed):
 *
 * 1. **Community** (`seedGlobalCommunityIfEmpty`) — loads
 *    api/fixtures/citizens.json + issues.json + watch-areas.json +
 *    notifications.json: 4 demo accounts (3 residents + the 311 operations
 *    desk), 10 issues spread across every category and every workflow
 *    status, each with its full issue_events timeline, plus confirmations,
 *    the demo users' watch areas, and a few feed rows. Fixture rows carry
 *    day OFFSETS (`days_ago` / `resolved_days_ago`) which are converted to
 *    timestamps AT SEED TIME, so the demo set always reads as "recent" no
 *    matter when the template is first booted. Addresses are DERIVED from
 *    the x/y pins through the same lib/geo.ts function the API uses for
 *    live reports — the fixtures never hardcode an address string.
 *
 * 2. **Per-user** (`seedDemoForUser`) — kept available for parity with
 *    other flagships, but currently a no-op for civic-311: a fresh resident
 *    should land in the real flow (report → duplicates → submit), and the
 *    global community already populates Explore, MyReports-shaped views of
 *    other citizens, and the detail pages.
 *
 * Called once at server boot from bonds/index.ts (setupBonds), wrapped in
 * try/catch — a seed failure must never block the API from serving.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import { count, create, findById } from '@molecule/api-database'

import { deriveAddress } from '../lib/geo.js'

/** Resolves api/fixtures/*.json from BOTH src/ (tsx watch) and dist/. */
const fixture = (name: string): URL => new URL(`../../fixtures/${name}.json`, import.meta.url)

interface CitizenFixture {
  user_id: string
  name: string
  email: string
  role: string
}

interface EventFixture {
  kind: 'status_change' | 'note' | 'comment'
  actor_index: number
  from?: string | null
  to?: string | null
  text?: string | null
  days_ago: number
}

interface IssueFixture {
  id: string
  reporter_index: number
  category: string
  description: string
  status: string
  x: number
  y: number
  days_ago: number
  resolved_days_ago?: number
  confirmations_from?: number[]
  events?: EventFixture[]
  official_note?: string | null
}

interface WatchAreaFixture {
  user_index: number
  name: string
  x: number
  y: number
  radius: number
}

interface NotificationFixture {
  user_index: number
  kind: string
  issue_index: number
  message: string
  days_ago: number
  read?: boolean
}

export interface SeedResult {
  citizensCreated: number
  issuesCreated: number
  eventsCreated: number
  confirmationsCreated: number
  watchAreasCreated: number
  notificationsCreated: number
}

const ZERO: SeedResult = {
  citizensCreated: 0,
  issuesCreated: 0,
  eventsCreated: 0,
  confirmationsCreated: 0,
  watchAreasCreated: 0,
  notificationsCreated: 0,
}

async function loadJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, 'utf8')) as T
}

const daysAgo = (d: number): string => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()

async function ensureCitizen(c: CitizenFixture): Promise<boolean> {
  const existing = await findById<Record<string, unknown>>('users', c.user_id)
  if (existing) return false
  await create('users', {
    id: c.user_id,
    email: c.email,
    name: c.name,
    username: c.email.split('@')[0],
    twoFactorEnabled: false,
    oauthData: {},
    planKey: 'free',
    role: c.role,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(90),
  })
  return true
}

/**
 * Seed the Riverton demo community if no issues exist. Idempotent.
 */
export async function seedGlobalCommunityIfEmpty(): Promise<SeedResult> {
  const existingIssues = await count('issues', [])
  if (existingIssues > 0) return ZERO

  const citizens = await loadJson<CitizenFixture[]>(fixture('citizens'))
  const issuesF = await loadJson<IssueFixture[]>(fixture('issues'))
  const areasF = await loadJson<WatchAreaFixture[]>(fixture('watch-areas'))
  const notifsF = await loadJson<NotificationFixture[]>(fixture('notifications'))

  const result: SeedResult = { ...ZERO }

  for (const c of citizens) {
    if (await ensureCitizen(c)) result.citizensCreated++
  }

  for (const f of issuesF) {
    const reporter = citizens[f.reporter_index]
    const derived_address = deriveAddress(f.x, f.y)
    await create('issues', {
      id: f.id,
      reporter_id: reporter.user_id,
      category: f.category,
      description: f.description,
      status: f.status,
      photo_url: null,
      x: f.x,
      y: f.y,
      derived_address,
      official_note: f.official_note ?? null,
      created_at: daysAgo(f.days_ago),
      updated_at: daysAgo(f.resolved_days_ago ?? Math.max(0, f.days_ago - 2)),
      resolved_at: f.resolved_days_ago !== undefined ? daysAgo(f.resolved_days_ago) : null,
    })
    result.issuesCreated++

    for (const e of f.events ?? []) {
      await create('issue_events', {
        issue_id: f.id,
        kind: e.kind,
        actor_id: citizens[e.actor_index].user_id,
        text: e.text ?? null,
        from_status: e.from ?? null,
        to_status: e.to ?? null,
        created_at: daysAgo(e.days_ago),
      })
      result.eventsCreated++
    }

    for (const idx of f.confirmations_from ?? []) {
      await create('confirmations', {
        issue_id: f.id,
        user_id: citizens[idx].user_id,
        created_at: daysAgo(Math.max(1, f.days_ago - 1)),
      })
      result.confirmationsCreated++
    }
  }

  for (const a of areasF) {
    await create('watch_areas', {
      user_id: citizens[a.user_index].user_id,
      name: a.name,
      x: a.x,
      y: a.y,
      radius: a.radius,
      created_at: daysAgo(30),
    })
    result.watchAreasCreated++
  }

  for (const n of notifsF) {
    await create('notifications', {
      user_id: citizens[n.user_index].user_id,
      kind: n.kind,
      issue_id: issuesF[n.issue_index].id,
      message: n.message,
      read_at: n.read ? daysAgo(n.days_ago) : null,
      created_at: daysAgo(n.days_ago),
    })
    result.notificationsCreated++
  }

  return result
}

/**
 * Per-user seed — intentionally a no-op for civic-311 (see module doc).
 * Kept for parity with the fleet's `_seed`-aware handlers.
 */
export async function seedDemoForUser(_userId: string): Promise<void> {
  void _userId
}
