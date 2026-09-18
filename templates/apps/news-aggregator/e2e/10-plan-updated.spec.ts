import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('plan-updated landing', () => {
  test('signed-in user landing on /plan-updated sees the thank-you message', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      const heading = page.getByRole('heading').first()
      await expect(heading).toBeVisible({ timeout: 10_000 })
    })
    // The auth-bond hydrate path issues at least one request (typically
    // a /api/users/* GET) when the page mounts.
    expect(reqs.length).toBeGreaterThan(0)
    const cta = page.getByRole('button', { name: /return|home|continue|reading|browse/i }).first()
    await expect(cta).toBeVisible()
  })

  test('clicking "Return home" navigates back to /', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated-cta'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await page
      .getByRole('link', { name: /return|home|continue|reading|browse/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/(home|)$/)
  })
})
