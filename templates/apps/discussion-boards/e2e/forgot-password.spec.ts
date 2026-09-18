import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts typed input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('#forgot-email')
    await email.fill('alice@example.com')
    await expect(email).toHaveValue('alice@example.com')
  })

  test('Send reset link POSTs /api/users/forgot-password and shows confirmation', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#forgot-email').fill(email)

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await expect(page.getByText(/Check your inbox/i)).toBeVisible({ timeout: 10_000 })
    })

    const fp = reqs.find((r) => /\/api\/users\/forgot-password$/.test(r.url) && r.method === 'POST')
    expect(fp, 'POST /api/users/forgot-password must have fired').toBeTruthy()
    expect(fp!.status).toBeLessThan(300)
  })

  test('Back to sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 })
  })

  test('Confirmation panel echoes the requested email', async ({ page }) => {
    const email = uniqueEmail('forgot-echo')
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#forgot-email').fill(email)
    await page.getByRole('button', { name: /Send reset link/i }).click()
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await expect(page.getByText(new RegExp(escaped, 'i'))).toBeVisible({ timeout: 10_000 })
  })
})
