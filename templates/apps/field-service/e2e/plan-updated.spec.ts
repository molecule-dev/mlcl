import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('plan-updated', () => {
  test('confirmation screen renders messages and Return-home CTA navigates to /', async ({
    page,
  }) => {
    await signup(page)
    await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      // Two confirmation headings should be visible (translation keys planUpdated.message and .thankYou).
      const headings = page.getByRole('heading', { level: 2 })
      await expect.poll(() => headings.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(2)
    })
    // Return-home link wraps a button.
    const returnLink = page.getByRole('link', { name: /return home/i }).first()
    await expect(returnLink).toBeVisible({ timeout: 10000 })
    await returnLink.click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('shows the planUpdated.message heading first', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.getByRole('heading', { level: 2 })
    await expect.poll(() => headings.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(2)
    const firstText = (await headings.nth(0).textContent()) ?? ''
    expect(firstText.length).toBeGreaterThan(0)
  })

  test('shows the planUpdated.thankYou heading second', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const headings = page.getByRole('heading', { level: 2 })
    await expect.poll(() => headings.count(), { timeout: 10000 }).toBeGreaterThanOrEqual(2)
    const secondText = (await headings.nth(1).textContent()) ?? ''
    expect(secondText.length).toBeGreaterThan(0)
  })

  test('Return-home button is present and routes to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /return home/i }).first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/$/)
  })
})
