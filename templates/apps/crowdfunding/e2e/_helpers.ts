// Shared helpers for crowdfunding e2e specs. Every spec imports from
// here so a contract change (signup form selectors, environment ports,
// etc.) only updates in one place.

import { Page, expect, type Response } from '@molecule/app-e2e-fixtures-default'

export const APP_BASE =
  process.env.APP_BASE || 'http://localhost:' + (process.env.VITE_PORT || '3000')
export const API_BASE =
  process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4000') + '/api'

let counter = 0
export function uniqueEmail(prefix = 'cf') {
  return `${prefix}+${Date.now()}-${++counter}@example.com`
}

/**
 * Sign up a fresh user via the UI. Lands on /dashboard.
 * The crowdfunding signup form has a single combined "Name" field plus
 * email + password (one input, no confirm). On success we navigate to
 * /dashboard via the in-app router.
 */
export async function signup(
  page: Page,
  email = uniqueEmail(),
  password = 'TestPass123!',
  name = 'CF Tester',
) {
  await page.goto(APP_BASE + '/signup')
  await page.locator('input[autocomplete="name"]').fill(name)
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[autocomplete="new-password"]').fill(password)
  const submit = page.getByRole('button', { name: /create account/i })
  await expect(submit).toBeEnabled({ timeout: 10000 })
  const signupResponse = page.waitForResponse(
    (r) => /\/api\/users(\?|$|\/)/.test(r.url()) && r.request().method() === 'POST',
    { timeout: 30000 },
  )
  await submit.click()
  const resp = await signupResponse
  expect(resp.status(), `POST /api/users → ${resp.status()}`).toBeLessThan(400)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })
  return { email, password, name }
}

/** Capture every fetch/XHR response during a block (for asserting backend
 *  invariants — was POST /api/foo actually issued? What status came back?). */
export async function captureNetwork(page: Page, fn: () => Promise<void>) {
  const reqs: { method: string; url: string; status: number }[] = []
  const onResp = (resp: Response) => {
    reqs.push({ method: resp.request().method(), url: resp.url(), status: resp.status() })
  }
  page.on('response', onResp)
  try {
    await fn()
  } finally {
    page.off('response', onResp)
  }
  return reqs
}

/** Drive a controlled React input by setting the native value via the
 *  prototype setter so onChange actually fires. */
export async function setInputValue(page: Page, selector: string, value: string) {
  await page.evaluate(
    ({ sel, val }) => {
      const el = document.querySelector(sel) as
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null
      if (!el) throw new Error('selector not found: ' + sel)
      const proto =
        el instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : el instanceof HTMLSelectElement
            ? window.HTMLSelectElement.prototype
            : window.HTMLInputElement.prototype
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
      setter.call(el, val)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { sel: selector, val: value },
  )
}

/** Fetch JSON from the API in the page context (cookies attached). */
export async function apiGet<T>(page: Page, path: string): Promise<T> {
  return (await page.evaluate(async (p: string) => {
    const r = await fetch(p)
    return r.json()
  }, path)) as T
}

/** POST JSON in the page context. Returns the parsed body and status. */
export async function apiPost<T>(
  page: Page,
  path: string,
  body: unknown,
): Promise<{ status: number; body: T }> {
  return await page.evaluate(
    async ({ p, b }) => {
      const r = await fetch(p, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b),
      })
      const text = await r.text()
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = text
      }
      return { status: r.status, body: parsed as T }
    },
    { p: path, b: body },
  )
}

// ---------------------------------------------------------------------------
// Live-catalog pickers.
//
// Specs read the campaign, tier and update they drive out of the API instead
// of naming the ones api/src/handlers/_seed.ts happens to create: the demo
// catalog is the first thing an app's owner replaces, and a spec that names a
// seeded row fails on a correct app.
// ---------------------------------------------------------------------------

export interface CatalogCampaign {
  id: string
  title: string
  category: string
  status: string
  goal_amount: number
  raised_amount: number
  goal_cents: number
  pledged_cents: number
  creator_name: string
}

export interface CatalogTier {
  id: string
  campaign_id: string
  title: string
  amount: number
  price_cents: number
}

export interface CampaignDetail extends CatalogCampaign {
  tiers: CatalogTier[]
}

/** The active catalog — the same list /discover renders. */
export async function getActiveCampaigns(page: Page): Promise<CatalogCampaign[]> {
  const data = await apiGet<
    CatalogCampaign[] | { data?: CatalogCampaign[]; items?: CatalogCampaign[] }
  >(page, '/api/campaigns?status=active&page=1&limit=60')
  const list = Array.isArray(data) ? data : (data.data ?? data.items ?? [])
  expect(list.length, 'catalog has active campaigns').toBeGreaterThan(0)
  return list
}

/** One campaign, decorated with its reward tiers. */
export async function getCampaign(page: Page, id: string): Promise<CampaignDetail> {
  const campaign = await apiGet<CampaignDetail>(page, '/api/campaigns/' + id)
  expect(campaign?.id, `GET /api/campaigns/${id}`).toBe(id)
  return campaign
}

/** A campaign's visible updates, newest first. */
export async function getCampaignUpdates(
  page: Page,
  id: string,
): Promise<Array<{ id: string; title: string }>> {
  return await apiGet<Array<{ id: string; title: string }>>(page, '/api/updates/campaign/' + id)
}

/**
 * An active campaign carrying at least `minTiers` reward tiers — what every
 * pledge flow needs. Throws when the catalog cannot express the behaviour
 * under test rather than asserting on a particular row.
 */
export async function pickBackableCampaign(page: Page, minTiers = 1): Promise<CampaignDetail> {
  for (const row of await getActiveCampaigns(page)) {
    const detail = await getCampaign(page, row.id)
    if ((detail.tiers ?? []).length >= minTiers) return detail
  }
  throw new Error(`catalog has no active campaign with ${minTiers} reward tier(s)`)
}

/** An active campaign that has published at least one update. */
export async function pickCampaignWithUpdate(
  page: Page,
  minTiers = 1,
): Promise<{ campaign: CampaignDetail; update: { id: string; title: string } }> {
  for (const row of await getActiveCampaigns(page)) {
    const campaign = await getCampaign(page, row.id)
    if ((campaign.tiers ?? []).length < minTiers) continue
    const updates = await getCampaignUpdates(page, row.id)
    if (updates.length > 0) return { campaign, update: updates[0] }
  }
  throw new Error('catalog has no backable active campaign with a published update')
}

/** Two active campaigns in different categories. */
export async function pickTwoCategories(
  page: Page,
): Promise<{ target: CatalogCampaign; other: CatalogCampaign }> {
  const catalog = await getActiveCampaigns(page)
  for (const target of catalog) {
    const other = catalog.find((c) => c.category !== target.category)
    if (other) return { target, other }
  }
  throw new Error('catalog needs active campaigns in two different categories')
}

/** Two active campaigns whose titles do not contain one another. */
export async function pickTwoDistinctTitles(
  page: Page,
): Promise<{ target: CatalogCampaign; other: CatalogCampaign }> {
  const catalog = await getActiveCampaigns(page)
  const disjoint = (a: string, b: string) =>
    !a.toLowerCase().includes(b.toLowerCase()) && !b.toLowerCase().includes(a.toLowerCase())
  for (const target of catalog) {
    const other = catalog.find((c) => c.id !== target.id && disjoint(c.title, target.title))
    if (other) return { target, other }
  }
  throw new Error('catalog needs two campaigns with distinguishable titles')
}

/** The dollar amount the checkout charges for a tier, as the summary formats it. */
export function formatTierTotal(tier: CatalogTier): string {
  return `$${Math.round(tier.price_cents / 100).toLocaleString()}`
}
