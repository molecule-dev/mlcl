import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail, whereUrl } from './_helpers.js'

test.describe('Forgot password page (/forgot-password)', () => {
  test('renders email input and submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('#forgot-email, #email').first()
    await expect(email).toBeVisible()
    await expect(page.getByRole('button', { name: /send|email me|reset/i }).first()).toBeVisible()
  })

  test('submitting an email POSTs to /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      const email = page.locator('#forgot-email, #email').first()
      await email.fill(uniqueEmail('forgot'))
      await page
        .getByRole('button', { name: /send|email me|reset/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const post = whereUrl(reqs, /\/api\/users\/forgot-password/, 'POST')
    expect(post.length, 'POST /api/users/forgot-password fired').toBeGreaterThan(0)
    expect(post[0].status, 'must not 5xx').toBeLessThan(500)
  })

  test('back-to-login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to log|sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('signup link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*up|create.*account/i })
    if (await link.count()) {
      await link.first().click()
      await expect(page).toHaveURL(/\/signup/)
    }
  })
})
