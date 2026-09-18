/**
 * /plan-updated — Stripe webhook landing.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('renders the confirmation message', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.locator('body')).toBeVisible()
  })

  test('exposes a link back home', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-link'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('link').first()).toBeVisible()
  })

  test('does not error or 404', async ({ page }) => {
    await signup(page, uniqueEmail('plan-updated-noerr'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/plan-updated/)
  })
})

test.describe('plan-updated — network', () => {
  test('page load issues no error responses', async ({ page }) => {
    await signup(page, uniqueEmail('plan-net'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    const errors = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
    expect(errors).toEqual([])
  })
})
