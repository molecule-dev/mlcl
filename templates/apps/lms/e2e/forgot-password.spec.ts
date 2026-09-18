import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders heading + email input + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('back-to-sign-in link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('submitting the form fires POST /api/users/forgot-password and shows confirmation', async ({
    page,
  }) => {
    const email = uniqueEmail('lms-forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input#email').fill(email)
      await page
        .getByRole('button', { name: /send reset link/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password$/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password fired').toBeTruthy()
    expect(post!.status, 'forgot-password endpoint returned 2xx').toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 5000,
    })
  })

  test('confirmation view echoes the submitted email and offers a back-to-sign-in link', async ({
    page,
  }) => {
    const email = uniqueEmail('lms-forgot-echo')
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(email)
    await page
      .getByRole('button', { name: /send reset link/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 5000,
    })
    await expect(page.getByText(email)).toBeVisible()
    const link = page.getByRole('link', { name: /back to sign in/i })
    await expect(link.first()).toBeVisible()
  })
})
