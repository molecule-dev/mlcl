/**
 * /audit — server-derived security & access feed. Even a brand-new
 * account renders the synthetic "current sign-in" row.
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

test.describe('/audit (Audit log)', () => {
  test('renders heading + eyebrow and GETs /api/audit_events', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/audit')
      await expect(page.getByRole('heading', { name: /audit log/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    })
    expect(
      reqs.find((r) => /\/api\/audit_events(?:\?|$)/.test(r.url) && r.status < 400),
    ).toBeTruthy()
    await expect(page.getByText(/security & access/i)).toBeVisible()
    await expect(page.getByText(/24 months/i)).toBeVisible()
  })

  test('synthetic sign-in row renders for any authenticated visit', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(/signed in to current session/i)).toBeVisible({ timeout: 15000 })
  })

  test('total-count chip renders ≥ 1 because of the synthetic row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(/\d+ total/i)).toBeVisible({ timeout: 15000 })
  })

  test('successful-count chip renders for the synthetic success row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(/\d+ successful/i)).toBeVisible({ timeout: 15000 })
  })

  test('a real transfer adds a transfer audit row to the feed', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'AuditFund', kind: 'checking', balance_cents: 1_000, available_cents: 1_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'AuditSink' })
    const memo = 'AuditTx ' + Date.now()
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 200,
      description: memo,
    })
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(memo).first()).toBeVisible({ timeout: 15000 })
  })

  test('a real bank-account create adds an account_link audit row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const name = 'LinkedAcct ' + Date.now()
    await seedAccount(page, accessToken, { name })
    await page.goto(APP_BASE + '/audit')
    await expect(page.getByText(new RegExp(name, 'i'))).toBeVisible({ timeout: 15000 })
  })

  test('feed is sorted by occurred_at desc (newest first)', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a1 = await seedAccount(page, accessToken, { name: 'OldOne ' + Date.now() })
    void a1
    await page.waitForTimeout(50)
    await seedAccount(page, accessToken, { name: 'NewOne ' + Date.now() })
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/audit_events', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: Array<{ occurred_at: string }> }
    const times = body.data.map((e) => new Date(e.occurred_at).getTime())
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeLessThanOrEqual(times[i - 1])
  })

  test('IP + user agent string renders in monospace under each row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/audit')
    await expect(page.locator('li p.font-mono').first()).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/audit_events response has { data: [...], total: N }', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/audit_events', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: unknown[]; total: number }
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(1)
  })
})
