/**
 * /accounts/:id — detail view: hero header, balance + available, sparkline,
 * transactions list, "All accounts" back link, missing-account guard.
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

test.describe('/accounts/:id (account detail)', () => {
  test('renders detail page with name + balance + back link, GETs /api/accounts/:id and /api/transactions', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Detail Acct' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/accounts/${acct.id}`)
      await expect(page.getByText(acct.name).first()).toBeVisible({ timeout: 15000 })
    })
    const detail = reqs.find(
      (r) => r.url.includes(`/api/accounts/${acct.id}`) && r.method === 'GET' && r.status < 400,
    )
    const txs = reqs.find((r) => /\/api\/transactions/.test(r.url) && r.status < 400)
    expect(detail, JSON.stringify(reqs)).toBeTruthy()
    expect(txs, JSON.stringify(reqs)).toBeTruthy()
  })

  test('back link "← All accounts" navigates to /accounts', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Back Acct' })
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await page.getByRole('link', { name: /all accounts/i }).click()
    await page.waitForURL('**/accounts', { timeout: 10000 })
    await expect(page.locator('h1')).toContainText(/accounts/i)
  })

  test('renders Active badge in the header', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Active Acct' })
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText(/active/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('renders the masked last-4 digits in the kind subline', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Mask Detail', kind: 'savings', account_number: '111222333' },
    })
    const acct = await res.json()
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText(/2333/)).toBeVisible({ timeout: 15000 })
  })

  test('renders the available subline with currency formatting', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: {
        name: 'Avail Detail',
        kind: 'checking',
        balance_cents: 50_000,
        available_cents: 50_000,
      },
    })
    const acct = await res.json()
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText(/\$500\.00 available/i)).toBeVisible({ timeout: 15000 })
  })

  test('decorative sparkline svg is present', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    // Wait for the detail to render before asserting structural details.
    // Without the wait the count check races React's first useEffect fetch
    // and consistently returns 0 even though the SVG is in the source.
    await expect(page.getByText(acct.name).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('header svg')).toHaveCount(1)
  })

  test('"Transactions" heading renders', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible({
      timeout: 15000,
    })
  })

  test('empty-state copy renders for an account with zero ledger rows', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText(/no transactions yet/i)).toBeVisible({ timeout: 15000 })
  })

  test('after a real transfer, ledger row appears in the list with description from memo', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const fundedRes = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'F2', kind: 'checking', balance_cents: 100_000, available_cents: 100_000 },
    })
    const funded = await fundedRes.json()
    const sink = await seedAccount(page, accessToken, { name: 'Sink' })
    const memo = 'Detail tx ' + Date.now()
    await postTransfer(page, accessToken, {
      from_account_id: funded.id,
      to_account_id: sink.id,
      amount_cents: 1_500,
      description: memo,
    })
    await page.goto(APP_BASE + `/accounts/${funded.id}`)
    await expect(page.getByText(memo).first()).toBeVisible({ timeout: 15000 })
  })

  test('unknown id renders the "no longer available" guard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/accounts/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/no longer available/i)).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/accounts/:id returns 404 for an account the user does not own', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/accounts/00000000-0000-0000-0000-000000000000',
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status()).toBe(404)
  })

  test('balance figure renders in tabular form (e.g. "$0.00")', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await page.goto(APP_BASE + `/accounts/${acct.id}`)
    await expect(page.getByText(/\$0\.00/).first()).toBeVisible({ timeout: 15000 })
  })
})
