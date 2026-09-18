import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.getByLabel(/Work email/i)
    await email.fill('user@example.com')
    await expect(email).toHaveValue('user@example.com')
  })

  test('submit fires POST /users/forgot-password and reveals the success panel', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Work email/i).fill(email)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send recovery link/i }).click()
      await page.waitForSelector('text=Email sent', { timeout: 10_000 }).catch(() => {})
    })

    const post = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(post, 'POST /api/users/forgot-password should fire').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    await expect(page.getByText(/Email sent/i)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Check your inbox at/i)).toBeVisible()
  })

  test('after success, "I have my reset code" navigates to /reset-password', async ({ page }) => {
    const email = uniqueEmail('forgot')
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/Work email/i).fill(email)
    await page.getByRole('button', { name: /Send recovery link/i }).click()
    await page.getByRole('button', { name: /I have my reset code/i }).click()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('"Back to sign in" footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })
})
