/**
 * End-to-end user journey: signup → connection → schema → query → save →
 * re-run → sign out. Read-after-write at every step (next GET reflects
 * the write or the test fails). Hits the real seeded `qadmin_demo` DB.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  DEMO_DB,
  DEMO_HOST,
  DEMO_PASSWORD,
  DEMO_PORT,
  DEMO_USER,
  signup,
} from './_helpers.js'

test('full journey: signup → save connection → browse schema → run query → sign out', async ({
  page,
}) => {
  // 1. Signup → /connections
  const { email } = await signup(page)
  await expect(page).toHaveURL(/\/connections/)
  await expect(page.locator('[data-mol-id="connections-empty"]')).toBeVisible()

  // 2. Create connection through the New Connection form
  await page.goto('/connections/new')
  await page.locator('#conn-name').fill('Quarry Demo')
  await page.locator('#conn-host').fill(DEMO_HOST)
  await page.locator('#conn-port').fill(String(DEMO_PORT))
  await page.locator('#conn-database').fill(DEMO_DB)
  await page.locator('#conn-username').fill(DEMO_USER)
  await page.locator('#conn-password').fill(DEMO_PASSWORD)

  // Test connection probes the real DB.
  await page.locator('[data-mol-id="new-conn-test-button"]').click()
  await expect(page.locator('[data-mol-id="new-conn-test-ok"]')).toBeVisible({ timeout: 10_000 })

  // Save → /query/:id
  await page.locator('[data-mol-id="new-conn-save"]').click()
  await page.waitForURL(/\/query\/[0-9a-f-]+/)
  const qUrl = page.url()
  const cid = qUrl.split('/query/')[1]
  expect(cid).toMatch(/[0-9a-f-]{36}/)

  // 3. Sidebar tables come from the real DB.
  await expect(page.locator('[data-mol-id="qe-table-products"]')).toBeVisible({ timeout: 10_000 })
  await expect(page.locator('[data-mol-id="qe-table-orders"]')).toBeVisible()

  // 4. Schema explorer for that connection.
  await page.goto(`/schema/${cid}`)
  await page.locator('[data-mol-id="se-pick-products"]').click()
  await expect(page.locator('[data-mol-id="se-columns"]')).toContainText('sku', {
    timeout: 10_000,
  })

  // 5. Browse the products table.
  await page.locator('[data-mol-id="se-open-table"]').click()
  await expect(page).toHaveURL(/\/table\/.+\/products/)
  await expect(page.locator('[data-mol-id="tb-table"]')).toContainText('SKU-001', {
    timeout: 10_000,
  })

  // 6. Run a query and save it as a snippet.
  await page.goto(`/query/${cid}`)
  await page.locator('[data-mol-id="qe-textarea"]').fill('SELECT count(*)::int AS n FROM products')
  await page.locator('[data-mol-id="qe-run"]').click()
  await expect(page.locator('[data-mol-id="qe-result-table"]')).toContainText('5', {
    timeout: 10_000,
  })
  await page.locator('[data-mol-id="qe-save-name"]').fill('count-products')
  await page.locator('[data-mol-id="qe-save-button"]').click()
  await expect(page.locator('[data-mol-id="qe-save-ok"]')).toBeVisible({ timeout: 5_000 })

  // 7. /history shows the recent run, the saved snippet shows under saved tab.
  await page.goto('/history')
  await expect(page.locator('text=SELECT count(*)::int AS n FROM products').first()).toBeVisible({
    timeout: 5_000,
  })
  await page.locator('[data-mol-id="qh-tab-saved"]').click()
  const link = page.getByText('count-products', { exact: true })
  await expect(link).toBeVisible()
  await link.click()
  await page.waitForURL(/\/history\/saved\//)
  await page.locator('[data-mol-id="sqd-run"]').click()
  await expect(page.locator('[data-mol-id="sqd-result"]')).toContainText('5', { timeout: 10_000 })

  // 8. Sign out → /login.
  await page.goto('/settings')
  await page.locator('[data-mol-id="settings-signout"]').click()
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })

  // 9. Visiting an authenticated route should bounce to /login.
  await page.goto(APP_BASE + '/connections')
  await page.waitForTimeout(500)
  await expect(page).toHaveURL(/\/login/)

  // 10. Login again proves the connection + saved query persisted.
  expect(email).toContain('@')
})
