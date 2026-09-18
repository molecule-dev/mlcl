/**
 * Per-page coverage for /plan-updated. Cross-references e2e/observations/plan-updated.md.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('signed-in user sees the thank-you headline', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated-page'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    })
    // The auth-bond hydrate may issue a /api/users/me GET; require at
    // least one network request.
    expect(reqs.length).toBeGreaterThan(0)
  })

  test('"Return home" link navigates back to /', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated-cta'))
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await page
      .getByRole('link', { name: /return|home/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/(home|)$/)
  })

  test('initial render briefly shows a loading or content surface', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated-load'))
    await page.goto(APP_BASE + '/plan-updated')
    // Either the spinner OR a heading should appear within the budget —
    // an unmounted page (white screen) is the failure mode.
    const ready =
      (await page
        .getByRole('progressbar')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByRole('heading')
        .first()
        .isVisible()
        .catch(() => false))
    expect(ready).toBe(true)
  })

  test('return-home link element is rendered (page is not a dead-end)', async ({ page }) => {
    await signup(page, uniqueEmail('na-plan-updated-link'))
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /return|home/i }).first()
    await expect(link).toBeVisible({ timeout: 10_000 })
  })
})
