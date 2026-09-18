/**
 * /dashboard — overview heading, hero balance card, cash/credit card,
 * accounts triad, recent activity. Empty-state for a brand-new user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  postTransfer,
  seedAccount,
  signup,
} from './_helpers.js'

async function fundAccount(
  page: import('@playwright/test').Page,
  accessToken: string,
  cents: number,
): Promise<{ id: string; name: string }> {
  return seedAccount(page, accessToken, { name: 'Funded ' + Date.now() }).then(async (a) => {
    // Use the create-account override fields to seed funds directly.
    const seeded = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: {
        name: 'Pre-funded ' + Date.now(),
        kind: 'checking',
        balance_cents: cents,
        available_cents: cents,
      },
      failOnStatusCode: false,
    })
    expect(seeded.status()).toBe(201)
    return (await seeded.json()) as { id: string; name: string }
  })
}

test.describe('dashboard page', () => {
  test('loads with three GETs (accounts/transactions/dashboard_stats)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.locator('h1')).toContainText(/overview/i, { timeout: 15000 })
    })
    const accts = reqs.find((r) => /\/api\/accounts(?:\?|$)/.test(r.url) && r.status < 400)
    const txs = reqs.find((r) => /\/api\/transactions(?:\?|$)/.test(r.url) && r.status < 400)
    const stats = reqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url) && r.status < 400)
    expect(accts, JSON.stringify(reqs)).toBeTruthy()
    expect(txs, JSON.stringify(reqs)).toBeTruthy()
    expect(stats, JSON.stringify(reqs)).toBeTruthy()
  })

  test('renders "Money in motion, always clear." subheading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/money in motion/i)).toBeVisible({ timeout: 15000 })
  })

  test('empty-state dashboard renders the Accounts heading and "View all" link', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /accounts/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: /view all/i }).first()).toBeVisible()
  })

  test('"View all →" (accounts) link navigates to /accounts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /view all/i })
      .first()
      .click()
    await page.waitForURL('**/accounts', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText(/accounts/i)
  })

  test('"View all →" (recent activity) link navigates to /transactions', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    const links = page.getByRole('link', { name: /view all/i })
    await links.last().click()
    await page.waitForURL('**/transactions', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText(/transactions/i)
  })

  test('seeded account renders in AccountsTriad on next dashboard load', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Triad Acct', kind: 'savings', account_number: '111222333' },
    })
    const acct = await res.json()
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('link', { name: new RegExp(`accounts/${acct.id}`) }).first())
      .toBeVisible({ timeout: 15000 })
      .catch(async () => {
        await expect(page.getByText(/2333/).first()).toBeVisible({ timeout: 15000 })
      })
    await expect(page.getByText(/savings/i).first()).toBeVisible()
  })

  test('dashboard_stats response shape includes net_worth_cents + cash_on_hand_cents', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/reports/dashboard_stats',
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('net_worth_cents')
    expect(body).toHaveProperty('cash_on_hand_cents')
    expect(body).toHaveProperty('balance_history_30d')
  })

  test('after a real transfer, recent activity shows a row reflecting it', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a = await fundAccount(page, accessToken, 200_000)
    const b = await seedAccount(page, accessToken, { name: 'Sink ' + Date.now() })
    await postTransfer(page, accessToken, {
      from_account_id: a.id,
      to_account_id: b.id,
      amount_cents: 5_000,
      description: 'Dashboard tx ' + Date.now(),
    })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(/Dashboard tx/).first()).toBeVisible({ timeout: 15000 })
  })

  test('cash-on-hand reflects the funded account balance', async ({ page }) => {
    const { accessToken } = await signup(page)
    await fundAccount(page, accessToken, 123_456)
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/reports/dashboard_stats',
      { headers: apiHeaders(accessToken) },
    )
    const body = await res.json()
    expect(body.cash_on_hand_cents).toBeGreaterThanOrEqual(123_456)
  })
})
