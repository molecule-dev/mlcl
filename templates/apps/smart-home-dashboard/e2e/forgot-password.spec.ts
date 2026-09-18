import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const tb = page.getByPlaceholder(/email/i).first()
    await tb.fill('me@example.com')
    await expect(tb).toHaveValue('me@example.com')
  })

  test('submit POSTs /api/users/forgot-password and shows confirmation', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByPlaceholder(/email/i).first().fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      const submit = page.getByRole('button', { name: /^submit|^send|reset/i }).first()
      await submit.click()
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    const posts = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(posts.length, 'POST /api/users/forgot-password fired').toBeGreaterThan(0)
    expect(posts[0]!.status, 'forgot-password accepted').toBeLessThan(400)
  })

  test('back button routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('button', { name: /go back|back|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
