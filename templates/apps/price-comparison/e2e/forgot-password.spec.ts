import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email input accepts email', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('input[type="email"]').first()
    await email.fill('test@example.com')
    await expect(email).toHaveValue('test@example.com')
  })

  test('submit triggers POST /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const post = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(post, 'POST /api/users/forgot-password fired').toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|back.*sign|log\s*in/i }).first()
    // Mid-hydration clicks on a React Router <Link> are swallowed — same fix as
    // the "Sign up" link below. Retry the click until navigation happens.
    await expect(async () => {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 2000 })
    }).toPass({ timeout: 15000 })
  })

  test('"Sign up" link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*up|create.*account/i }).first()
    // This is a React Router <Link>. A click that lands mid-hydration is swallowed
    // — the anchor's default navigation is prevented but the router is not yet
    // listening, so the URL never changes and the test failed, then passed on
    // retry. toPass re-attempts the click until the navigation actually happens.
    await expect(async () => {
      await link.click()
      await expect(page).toHaveURL(/\/signup/, { timeout: 2000 })
    }).toPass({ timeout: 15000 })
  })
})
