/**
 * /subscribers — the list page: manual add, filters, and status flips.
 * All expected values are read from the API inside the tests.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, seedSubscriber, signup, uniqueEmail } from './_helpers.js'

test.describe('subscribers page', () => {
  test('requires auth (redirects anonymous visitors)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/subscribers')
    await expect(page).not.toHaveURL(/\/subscribers$/, { timeout: 15000 })
  })

  test('lists a manually added subscriber with status + tier', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('subs-list'))
    const { id, email } = await seedSubscriber(page, accessToken, { tier: 'paid' })
    await page.goto(APP_BASE + '/subscribers')
    const row = page.locator(`[data-mol-id="subscriber-row-${id}"]`)
    await expect(row).toBeVisible({ timeout: 15000 })
    await expect(row.getByText(email)).toBeVisible()
    await expect(page.locator(`[data-mol-id="subscriber-status-${id}"]`)).toHaveText(/subscribed/i)
    await expect(row.getByText('Paid', { exact: true })).toBeVisible()
  })

  test('manual add through the form creates a subscribed row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('subs-add'))
    const email = uniqueEmail('subs-add-form')
    await page.goto(APP_BASE + '/subscribers')
    await page.locator('#add-subscriber-email').fill(email)
    await page.locator('#add-subscriber-tier').selectOption('paid')
    await page.locator('[data-mol-id="subscribers-add-submit"]').click()
    await expect(page.getByText(email).first()).toBeVisible({ timeout: 15000 })
    const res = await page.request.get(`${API_BASE}/subscribers?q=${encodeURIComponent(email)}`, {
      headers: authHeaders(accessToken),
    })
    const body = (await res.json()) as { data: Array<{ email: string; tier: string }> }
    const row = body.data.find((s) => s.email === email)
    expect(row).toBeTruthy()
    expect(row!.tier).toBe('paid')
  })

  test('duplicate manual add is rejected with a visible message', async ({ page }) => {
    // Expected-4xx flow: the duplicate email is rejected with 409.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 409' })
    const { accessToken } = await signup(page, uniqueEmail('subs-dupe'))
    const { email } = await seedSubscriber(page, accessToken)
    await page.goto(APP_BASE + '/subscribers')
    await page.locator('#add-subscriber-email').fill(email)
    await page.locator('[data-mol-id="subscribers-add-submit"]').click()
    await expect(
      page.locator('[data-mol-id="subscribers-add-form"]').getByRole('status'),
    ).toBeVisible({ timeout: 15000 })
  })

  test('unsubscribe from the table flips the status chip', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('subs-unsub'))
    const { id } = await seedSubscriber(page, accessToken)
    await page.goto(APP_BASE + '/subscribers')
    await page.locator(`[data-mol-id="subscriber-unsubscribe-${id}"]`).click()
    await expect(page.locator(`[data-mol-id="subscriber-status-${id}"]`)).toHaveText(
      /unsubscribed/i,
      {
        timeout: 15000,
      },
    )
  })

  test('status filter tabs narrow the table', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('subs-filter'))
    const subscribed = await seedSubscriber(page, accessToken)
    await page.goto(APP_BASE + '/subscribers')
    await page.locator('[data-mol-id="subscribers-filter-unsubscribed"]').click()
    await expect(page.locator(`[data-mol-id="subscriber-row-${subscribed.id}"]`)).toHaveCount(0, {
      timeout: 15000,
    })
  })
})
