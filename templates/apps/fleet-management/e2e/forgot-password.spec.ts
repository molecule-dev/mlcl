import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('forgot-password', () => {
  test('page renders heading + email input + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(
      page.getByRole('heading', { name: /reset your password/i, level: 2 }),
    ).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
  })

  test('"Sign In" footer link navigates back to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('submitting POSTs /api/users/forgot-password and shows confirmation panel', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input#email').fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await expect(page.getByRole('heading', { name: /check your email/i, level: 2 })).toBeVisible({
        timeout: 10000,
      })
    })
    const fpReq = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(fpReq?.status, 'POST /api/users/forgot-password').toBeGreaterThanOrEqual(200)
    expect(fpReq?.status).toBeLessThan(300)
  })

  test('confirmation panel exposes "Back to sign in" button which navigates to /login', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input#email').fill(uniqueEmail('forgot-back'))
    await page.getByRole('button', { name: /send reset link/i }).click()
    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({
      timeout: 10000,
    })
    await page.getByRole('button', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
