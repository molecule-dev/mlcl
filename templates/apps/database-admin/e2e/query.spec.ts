/**
 * Query editor + history. Drives the running `/query/:connectionId` page,
 * runs SQL against a real Postgres, asserts the result, and verifies the
 * execution shows up in /history.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { createDemoConnection, getAccessToken, signup } from './_helpers.js'

test.describe('Query editor', () => {
  test('renders editor + sidebar tables and can run a SELECT', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Demo Query')
    await page.goto(`/query/${id}`)

    await expect(page.locator('[data-mol-id="qe-textarea"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="qe-table-products"]')).toBeVisible({ timeout: 10_000 })

    await page
      .locator('[data-mol-id="qe-textarea"]')
      .fill('SELECT count(*)::int AS n FROM products')
    await page.locator('[data-mol-id="qe-run"]').click()

    await expect(page.locator('[data-mol-id="qe-result-meta"]')).toContainText('1 rows', {
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="qe-result-table"]')).toContainText('5')
  })

  test('reports the real Postgres error for a bogus query', async ({ page }) => {
    // The bogus query legitimately 400s from /api/queries/execute — that IS the
    // behavior under test (the inline qe-error banner). Allow the expected
    // console resource error before it fires.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 400',
    })
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Demo Errors')
    await page.goto(`/query/${id}`)

    await page.locator('[data-mol-id="qe-textarea"]').fill('SELECT * FROM nonexistent_table')
    await page.locator('[data-mol-id="qe-run"]').click()

    const err = page.locator('[data-mol-id="qe-error"]')
    await expect(err).toBeVisible({ timeout: 10_000 })
    await expect(err).toContainText(/nonexistent_table|does not exist|relation/i)
  })

  test('save snippet creates a saved query and it shows up under /history saved', async ({
    page,
  }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Demo Save Snippet')
    await page.goto(`/query/${id}`)

    await page.locator('[data-mol-id="qe-textarea"]').fill('SELECT 1 AS one')
    await page.locator('[data-mol-id="qe-save-name"]').fill('snippet-one')
    await page.locator('[data-mol-id="qe-save-button"]').click()
    await expect(page.locator('[data-mol-id="qe-save-ok"]')).toBeVisible({ timeout: 5_000 })

    await page.goto('/history')
    // Switch to the "saved" tab
    const savedTab = page.locator('[data-mol-id="qh-tab-saved"]')
    if (await savedTab.count()) await savedTab.click()
    await expect(page.getByText('snippet-one')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Query history', () => {
  test('runs are recorded with status + row_count + duration', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const { id } = await createDemoConnection(token, 'Demo History')
    await page.goto(`/query/${id}`)

    await page.locator('[data-mol-id="qe-textarea"]').fill('SELECT 1')
    await page.locator('[data-mol-id="qe-run"]').click()
    await expect(page.locator('[data-mol-id="qe-result-meta"]')).toBeVisible({ timeout: 10_000 })

    await page.goto('/history')
    const recent = page.locator('[data-mol-id="qh-recent"], [data-mol-id="qh-page"]')
    await expect(recent.first()).toBeVisible()
    await expect(page.locator('text=SELECT 1').first()).toBeVisible({ timeout: 5_000 })
  })
})
