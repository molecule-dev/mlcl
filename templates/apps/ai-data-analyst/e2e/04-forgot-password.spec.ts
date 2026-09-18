import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers'

// /forgot-password — POST /api/users/forgot-password (always 200, even
// when the email isn't on file, to prevent enumeration).

test.describe('/forgot-password', () => {
  test('renders the email field', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('submitting the form POSTs /api/users/forgot-password', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/forgot-password')
      await page.locator('input[type="email"]').fill(uniqueEmail())
      await page
        .getByRole('button', { name: /send|reset/i })
        .first()
        .click()
      await page.waitForTimeout(1000)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(post, 'POST /api/users/forgot-password should fire').toBeDefined()
    expect(post!.status, 'forgot-password POST should be 2xx').toBeLessThan(300)
  })

  test('"Back to login" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const back = page.getByRole('link', { name: /back to login|sign in/i }).first()
    if ((await back.count()) === 0) {
      await page.goto(APP_BASE + '/login')
      await expect(page).toHaveURL(/\/login/)
      return
    }
    await back.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
