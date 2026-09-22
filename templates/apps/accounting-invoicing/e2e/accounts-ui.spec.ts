/**
 * /accounts — chart-of-accounts page (read-only) + the mobile shell
 * (sticky top bar + drawer below md). Backend CRUD itself is covered by
 * accounts.spec.ts at the API level.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, seedAccount, signup } from './_helpers.js'

test.describe('chart of accounts page', () => {
  test('nav links to /accounts and the page lists seeded accounts grouped by type', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    // seedAccount returns { id, code } only — assert on the literal name.
    const seeded = await seedAccount(page, accessToken, { type: 'asset', name: 'Operating Cash' })
    await page.goto(APP_BASE + '/dashboard')
    await page.getByRole('link', { name: /^accounts$/i }).click()
    await page.waitForURL('**/accounts')
    await expect(page.getByRole('heading', { name: /chart of accounts/i })).toBeVisible()
    await expect(page.getByText('Operating Cash')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText(seeded.code)).toBeVisible()
  })

  test('empty state renders for a fresh user with no accounts', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/accounts')
    await expect(page.getByText(/no accounts yet/i)).toBeVisible({ timeout: 10000 })
  })

  test('balances render as dollar amounts, not raw NUMERIC strings', async ({ page }) => {
    const { accessToken } = await signup(page)
    // POST create doesn't take a balance (schema omits it) — set it via PUT,
    // which is how the balance moves in the domain.
    const created = await page.request.post(`${API_BASE}/accounts`, {
      headers: apiHeaders(accessToken),
      data: { code: '1001', name: 'Balance Check', type: 'asset' },
    })
    expect(created.status()).toBe(201)
    const row = (await created.json()) as { id: string }
    const upd = await page.request.put(`${API_BASE}/accounts/${row.id}`, {
      headers: apiHeaders(accessToken),
      data: { balance: 1234.5 },
      failOnStatusCode: false,
    })
    expect(upd.status(), await upd.text()).toBeLessThan(400)
    await page.goto(APP_BASE + '/accounts')
    // Scope to the row: the "Total assets" KPI shows the same amount.
    await expect(page.getByRole('listitem').getByText('$1,234.50')).toBeVisible({
      timeout: 10000,
    })
  })
})

test.describe('mobile shell (< md)', () => {
  test('sidebar is hidden, top bar + drawer navigate', async ({ page }) => {
    await signup(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('ledger-topbar')).toBeVisible()
    // The desktop sidebar rail is hidden at this width.
    await expect(page.locator('aside')).toBeHidden()

    await page.getByTestId('ledger-drawer-toggle').click()
    const drawer = page.getByRole('navigation', { name: /primary navigation/i })
    await expect(drawer).toBeVisible()
    await drawer.getByRole('link', { name: /^invoices$/i }).click()
    await page.waitForURL('**/invoices')
    // Drawer auto-closes on navigation.
    await expect(page.getByTestId('ledger-drawer')).toHaveCount(0)
  })
})
