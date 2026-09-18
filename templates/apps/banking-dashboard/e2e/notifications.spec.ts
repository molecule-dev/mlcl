/**
 * /notifications — server-derived feed of recent transactions, completed
 * transfers, and ready statements. Empty for a brand-new user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  postTransfer,
  seedAccount,
  seedStatement,
  signup,
} from './_helpers.js'

test.describe('/notifications (Notifications)', () => {
  test('renders eyebrow, h1, subheading and GETs /api/notifications', async ({ page }) => {
    await signup(page)
    // Arm the response waiter BEFORE navigating; the h1 renders from the
    // page shell (before any data fetch) so toBeVisible() can resolve
    // before /api/notifications lands, racing captureNetwork.
    const respPromise = page.waitForResponse(
      (r) =>
        /\/api\/notifications(?:\?|$)/.test(r.url()) &&
        r.request().method() === 'GET' &&
        r.status() < 400,
      { timeout: 15000 },
    )
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /notifications/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await respPromise
    await expect(page.getByText(/activity feed/i)).toBeVisible()
    await expect(page.getByText(/real-time alerts/i)).toBeVisible()
  })

  test('empty-state heading "You\'re all caught up" renders for fresh users', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /caught up/i })).toBeVisible({ timeout: 15000 })
  })

  test('after a completed transfer, transfer-complete row appears in the feed', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'NotifFund', kind: 'checking', balance_cents: 1_000, available_cents: 1_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'NotifSink' })
    const memo = 'Notif tx ' + Date.now()
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 250,
      description: memo,
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/transfer complete/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('after a transaction is created, transaction_alert renders in the feed', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'TxAlertFund', kind: 'checking', balance_cents: 1_000, available_cents: 1_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'TxAlertSink' })
    const merchant = 'TxAlert ' + Date.now()
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 100,
      description: merchant,
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(merchant).first()).toBeVisible({ timeout: 15000 })
  })

  test('after seeding a statement, statement_ready row appears in the feed', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'NotifStmt' })
    await seedStatement(page, accessToken, acct.id)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/statement ready/i)).toBeVisible({ timeout: 15000 })
  })

  test('unread chip renders ≥ 1 once any transaction-derived item exists', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'UnreadFund', kind: 'checking', balance_cents: 5_000, available_cents: 5_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'UnreadSink' })
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 100,
      description: 'unread test',
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/\d+ unread/i)).toBeVisible({ timeout: 15000 })
  })

  test('transactions-count chip appears when transaction-derived items present', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'TxnChipFund', kind: 'checking', balance_cents: 5_000, available_cents: 5_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'TxnChipSink' })
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 100,
      description: 'chip-test ' + Date.now(),
    })
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByText(/\d+ transactions/i)).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/notifications response shape is { data: [...], total: N }', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/notifications', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: unknown[]; total: number }
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
  })

  test('feed items sorted by created_at desc', async ({ page }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'OrderFund', kind: 'checking', balance_cents: 5_000, available_cents: 5_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'OrderSink' })
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 50,
      description: 'first',
    })
    // The created_at column is millisecond-resolution; postTransfer awaits
    // the server response so the first row's created_at is already final.
    // The second postTransfer's server-side timestamp will be strictly >=
    // the first's, which is sufficient for the desc-sort assertion below.
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 50,
      description: 'second',
    })
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/notifications', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { data: Array<{ created_at: string }> }
    const times = body.data.map((e) => new Date(e.created_at).getTime())
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeLessThanOrEqual(times[i - 1])
  })
})
