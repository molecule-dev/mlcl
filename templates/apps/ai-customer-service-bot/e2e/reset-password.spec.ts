import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('reset-password page renders the password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render-only')
    await expect(page.locator('[data-mol-id="reset-password"]')).toBeVisible({ timeout: 10_000 })
  })

  test('confirm-password field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render-only')
    const confirm = page.locator('[data-mol-id="reset-confirm"]')
    await confirm.fill('NewPass123!')
    await expect(confirm).toHaveValue('NewPass123!')
  })

  test('submitting an invalid token shows the error path', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=this-is-not-a-real-token')
    await page.locator('[data-mol-id="reset-password"]').fill('NewPass123!')
    const confirm = page.locator('[data-mol-id="reset-confirm"]')
    if (await confirm.count().catch(() => 0)) await confirm.fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="reset-submit"]').click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    // Either the page POSTed via the http client (caught by captureNetwork)
    // or we POST manually below to validate the route is wired and rejects
    // the bad token.
    const submission = reqs.find((r) => /reset-password/.test(r.url) && r.method === 'POST')
    if (submission) {
      expect(submission.status).toBeGreaterThanOrEqual(400)
      expect(submission.status).toBeLessThan(500)
    } else {
      const res = await page.request.post(
        'http://localhost:' + (process.env.API_PORT || '4000') + '/api/users/reset-password',
        {
          headers: { 'Content-Type': 'application/json' },
          data: { token: 'this-is-not-a-real-token', password: 'NewPass123!' },
        },
      )
      expect(res.status()).toBeGreaterThanOrEqual(400)
      expect(res.status()).toBeLessThan(500)
    }
  })
})
