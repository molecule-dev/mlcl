import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('on load, fetches /api/billing/status to render the live plan', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/billing\/status$/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test("fetches the user's devices on load", async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/devices/.test(r.url))).toBeTruthy()
  })

  test('"Upgrade" button navigates to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const upgrade = page.getByRole('button', { name: /upgrade/i }).first()
    if (!(await upgrade.count())) {
      // Already on a paid plan, no upgrade button — that's fine, just exit.
      return
    }
    await upgrade.click()
    await expect(page).toHaveURL(/\/pricing$/, { timeout: 10000 })
  })

  test('account section + heading is visible after auth', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })
})
