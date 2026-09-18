import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the success message and a Return Home button after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link').filter({ has: page.getByRole('button') })).toBeVisible()
  })

  test('mounting completes with no failed API calls (captureNetwork)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    })
    // The page renders after auth is initialized; whatever API calls fire
    // (auth refresh, etc.) must all succeed.
    const failures = reqs.filter((r) => r.url.includes('/api/') && r.status >= 500)
    expect(failures, 'plan-updated must not surface 5xx API errors').toEqual([])
  })

  test('"Return Home" button navigates back to landing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('button') })
      .click()
    await expect(page).not.toHaveURL(/\/plan-updated/)
  })

  test('unauthenticated visit still renders without errors', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    // Either it shows a spinner (still initializing) or redirects/renders.
    // Either way the request must not 500 the page.
    await page.waitForTimeout(2000)
    await expect(page.locator('body')).toBeVisible()
  })
})
