import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: /tickets/new', () => {
  test('GET /tickets/new renders the create-ticket form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tickets/new')
    await expect(
      page.getByTestId('ticket-new-title').or(page.locator('[data-mol-id="ticket-new-title"]')),
    ).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-mol-id="ticket-subject"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="ticket-description"]')).toBeVisible()
  })

  test('blank /tickets/new keeps submit disabled (no clickthrough)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tickets/new')
    const submit = page.locator('[data-mol-id="ticket-new-submit"]')
    await expect(submit).toBeDisabled()
    await expect(page).toHaveURL(/\/tickets\/new/)
  })

  test('unauthed /tickets/new redirects to /login (AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/tickets/new')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('submitting /tickets/new posts to /api/tickets (captured)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tickets/new')
    const subj = `Captured ticket ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="ticket-subject"]').fill(subj)
      await page.locator('[data-mol-id="ticket-description"]').fill('captured-network description')
      await page.locator('[data-mol-id="ticket-new-submit"]').click()
      await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })
    })
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/tickets'))).toBe(true)
  })
})
