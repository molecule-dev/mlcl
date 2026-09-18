import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

// /docs/changelog — fetches /api/changelog and renders versioned cards.
// Either rows are visible or the "No releases yet" empty-state replaces
// the spinner.

test.describe('/docs/changelog', () => {
  test('heading renders + GET /api/changelog fires', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/docs/changelog')
      await page.getByRole('heading', { name: /Changelog/i }).waitFor({ timeout: 15_000 })
    })
    const call = reqs.find((r) => /\/api\/changelog(\?|$)/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/changelog should fire').toBeTruthy()
    expect(call!.status).toBe(200)
  })

  test('eyebrow label visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/changelog')
    await expect(page.getByText(/release_notes/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('either release rows are listed OR empty state visible — never hangs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/docs/changelog')
    await page.getByRole('heading', { name: /Changelog/i }).waitFor({ timeout: 15_000 })
    await expect(page.getByText(/^loading…$/i)).not.toBeVisible({ timeout: 15_000 })
    // Either at least one release row (a `vX.Y.Z` link anchor inside a
    // <li>) is rendered OR the empty-state copy is visible.
    const hasReleases = await page
      .locator('li')
      .filter({ has: page.locator('a[href^="#"]') })
      .first()
      .isVisible()
      .catch(() => false)
    const hasEmpty = await page
      .getByText(/no releases yet/i)
      .isVisible()
      .catch(() => false)
    expect(hasReleases || hasEmpty, 'either releases or empty state must be visible').toBeTruthy()
  })
})
