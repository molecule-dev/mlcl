import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors, signup } from './_helpers.js'

test.describe('dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
  })

  test('renders a heading on /dashboard', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('Browse-jobs link routes to /jobs', async ({ page }) => {
    const link = page.getByRole('link', { name: /jobs|browse/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/jobs(?:\?|$)/)
    }
  })

  test('Post-job link routes to /post-job', async ({ page }) => {
    const link = page.getByRole('link', { name: /post.*job/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/post-job(?:\?|$)/)
    }
  })

  test('mount triggers a GET to /api/jobs', async ({ page, browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/dashboard')
      await p2.waitForTimeout(1500)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/jobs\b/.test(r.url))).toBeTruthy()
    await fresh.close()
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
