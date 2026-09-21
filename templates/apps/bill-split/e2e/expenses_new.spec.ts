import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, createGroupViaApi, getGroupDetail, signup } from './_helpers.js'

test.describe('/expenses/new page', () => {
  test('Evenly brand link is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.getByRole('link', { name: /evenly/i }).first()).toBeVisible()
  })

  test('sidebar Dashboard link routes to /dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('aside a[href="/dashboard"], nav a[href="/dashboard"]').first().click()
    await page.waitForURL('**/dashboard', { timeout: 5000 })
  })

  test('sidebar Activity link routes to /activity', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('aside a[href="/activity"], nav a[href="/activity"]').first().click()
    await page.waitForURL('**/activity', { timeout: 5000 })
  })

  test('sidebar Friends link routes to /friends', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('aside a[href="/friends"], nav a[href="/friends"]').first().click()
    await page.waitForURL('**/friends', { timeout: 5000 })
  })

  test('Settings link routes to /settings', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('a[href="/settings"]').first().click()
    await page.waitForURL('**/settings', { timeout: 5000 })
  })

  test('form mounts with group + payer selects and split modes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await expect(page.locator('[data-mol-id="form-new-expense"]')).toBeVisible()
    await expect(page.locator('#expense-group')).toBeVisible()
    await expect(page.locator('#expense-payer')).toBeVisible()
    for (const mode of ['equal', 'exact', 'shares']) {
      await expect(page.locator(`[data-mol-id="btn-split-${mode}"]`)).toBeVisible()
    }
  })

  test('equal split through the UI lands the expense in the group', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + `/expenses/new?group=${group.id}`)
    await page.locator('#expense-description').fill('E2E Equal Split')
    await page.locator('#expense-amount').fill('60.00')
    await page.locator('[data-mol-id="btn-submit-expense"]').click()
    await page.waitForURL(new RegExp(`\\/groups\\/${group.id}`), { timeout: 10000 })
    await expect(
      page.locator('[data-mol-id^="expense-row-"]').filter({ hasText: 'E2E Equal Split' }),
    ).toBeVisible()
    await expect(page.locator('[data-mol-id^="expense-row-"]').first()).toContainText('$60.00')
    const detail = await getGroupDetail(page, accessToken, group.id)
    // 3 members, equal split: every net is ±2000 or the payer's +4000 offset.
    const nets = detail.balances.map((b) => b.net_cents).sort((a, b) => a - b)
    expect(nets).toEqual([-2000, -2000, 4000])
  })

  test('exact split rejects a mismatched total and accepts a matching one', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    await page.goto(APP_BASE + `/expenses/new?group=${group.id}`)
    await page.locator('#expense-description').fill('E2E Exact Split')
    await page.locator('#expense-amount').fill('30.00')
    await page.locator('[data-mol-id="btn-split-exact"]').click()
    // Three member rows each get a share input; leave them empty (sum 0 ≠ 3000).
    await page.locator('[data-mol-id="btn-submit-expense"]').click()
    await expect(page.locator('[data-mol-id="new-expense-error"]')).toBeVisible()
    await expect(page).toHaveURL(/\/expenses\/new/)
    // Now fill exact shares that sum exactly: 10.00 + 15.00 + 5.00.
    const shareInputs = page.locator(
      '[data-mol-id="form-new-expense"] input[type="number"][step="0.01"]',
    )
    const members = group.members
    for (let i = 0; i < members.length; i++) {
      await page
        .locator(`[data-mol-id="split-row-${members[i].id}"] input[type="number"][step="0.01"]`)
        .fill(['10.00', '15.00', '5.00'][i] ?? '0.00')
    }
    await expect(shareInputs.first()).toBeVisible()
    await page.locator('[data-mol-id="btn-submit-expense"]').click()
    await page.waitForURL(new RegExp(`\\/groups\\/${group.id}`), { timeout: 10000 })
    const detail = await getGroupDetail(page, accessToken, group.id)
    const nets = detail.balances.map((b) => b.net_cents).sort((a, b) => a - b)
    // Payer (You) nets +2000; the 15.00 and 5.00 shares owe -1500 / -500.
    // toEqual compares post-sort — the expected array must be ascending too.
    expect(nets).toEqual([-1500, -500, 2000])
  })

  test('shares split weights the apportionment', async ({ page }) => {
    const { accessToken } = await signup(page)
    const group = await createGroupViaApi(page, accessToken)
    const members = group.members
    await page.goto(APP_BASE + `/expenses/new?group=${group.id}`)
    await page.locator('#expense-description').fill('E2E Shares Split')
    await page.locator('#expense-amount').fill('90.00')
    await page.locator('[data-mol-id="btn-split-shares"]').click()
    // Weight the first member 2x, others default 1 → 2:1:1 of 9000.
    await page
      .locator(`[data-mol-id="split-row-${members[0].id}"] input[type="number"][step="1"]`)
      .fill('2')
    await page.locator('[data-mol-id="btn-submit-expense"]').click()
    await page.waitForURL(new RegExp(`\\/groups\\/${group.id}`), { timeout: 10000 })
    const detail = await getGroupDetail(page, accessToken, group.id)
    const owedById = new Map(detail.balances.map((b) => [b.member_id, b.owed_cents]))
    expect(owedById.get(members[0].id)).toBe(4500)
    expect(owedById.get(members[1].id)).toBe(2250)
    expect(owedById.get(members[2].id)).toBe(2250)
  })

  test('category chips switch the selection', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/expenses/new')
    await page.locator('[data-mol-id="btn-category-meals"]').click()
    await expect(page.locator('[data-mol-id="btn-category-meals"]')).toHaveClass(/bg-primary/)
  })
})
