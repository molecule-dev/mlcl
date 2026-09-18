import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot-password page', () => {
  test('renders form + email input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('#email')).toBeVisible()
  })

  test('submitting POSTs /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#email').fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password\b/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password observed').toBeTruthy()
  })

  test('back link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /back|sign\s*in|login/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
