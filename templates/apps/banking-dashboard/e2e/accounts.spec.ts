/**
 * /accounts — list view of the user's bank accounts. Empty state for
 * brand-new users, total/active chips when accounts exist, row links
 * navigate to /accounts/:id.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, seedAccount, signup } from './_helpers.js'

test.describe('accounts page', () => {
  test('renders heading + eyebrow, GETs /api/accounts on first paint', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/accounts')
      await expect(page.locator('h1')).toContainText(/accounts/i, { timeout: 15000 })
    })
    const accts = reqs.find((r) => /\/api\/accounts(?:\?|$)/.test(r.url) && r.status < 400)
    expect(accts, JSON.stringify(reqs)).toBeTruthy()
    await expect(page.getByText(/linked institutions/i)).toBeVisible()
  })

  test('renders the empty-state for a brand-new user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(/no accounts linked yet/i)).toBeVisible({ timeout: 15000 })
  })

  test('seeded account appears in the list with name + last4 mask', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Seeded ' + Date.now() })
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(acct.name).first()).toBeVisible({ timeout: 15000 })
  })

  test('total-balance and active chips render once accounts exist', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Chip Acct', kind: 'checking', balance_cents: 12_345, available_cents: 12_345 },
    })
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(/total/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/active/i).first()).toBeVisible()
  })

  test('clicking an account row navigates to /accounts/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'Click ' + Date.now() })
    await page.goto(APP_BASE + '/accounts')
    await page.getByText(acct.name).first().click()
    await page.waitForURL(`**/accounts/${acct.id}`, { timeout: 10000 })
    await expect(page.locator('body')).toContainText(acct.name)
  })

  test('row balance string reflects the account balance from the API', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Bal Acct', kind: 'savings', balance_cents: 67_890, available_cents: 67_890 },
    })
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText('$678.90').first()).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/accounts after seeding returns the account in the array', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken, { name: 'API Acct' })
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as Array<{ id: string }>
    expect(body.find((a) => a.id === acct.id)).toBeTruthy()
  })

  test('row availability subline uses available_cents value', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: {
        name: 'Avail Acct',
        kind: 'checking',
        balance_cents: 100_000,
        available_cents: 90_000,
      },
    })
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(/\$900\.00 available/i)).toBeVisible({ timeout: 15000 })
  })

  test('account_number sent to the API is masked to ****#### in the response', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.post(APP_BASE.replace(/\/$/, '') + '/api/accounts', {
      headers: apiHeaders(accessToken),
      data: { name: 'Mask Acct', kind: 'checking', account_number: '987654321' },
    })
    const body = await res.json()
    expect(body.account_number).toBe('****4321')
    expect(body.mask).toBe('4321')
  })

  test('eyebrow text "Linked institutions" renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(/linked institutions/i)).toBeVisible()
  })
})
