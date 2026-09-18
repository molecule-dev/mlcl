import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/forgot-password', () => {
  test('renders email field and submit', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(
      page.getByRole('button', { name: /send|reset|submit|continue|recovery/i }).first(),
    ).toBeVisible()
  })

  test('Submitting fires POST /api/users/forgot-password', async ({ page, browser }) => {
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    const { email } = await signup(p)
    await ctx.close()

    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('textbox', { name: /email/i }).fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /send|reset|continue|submit/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    const forgotCall = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(forgotCall, 'forgot-password call must fire').toBeDefined()
    expect(forgotCall!.status).toBeLessThan(500)
  })

  test('Back-to-login link → /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const a = page.getByRole('link', { name: /back|sign.*in|login/i }).first()
    if (await a.count()) {
      const href = await a.getAttribute('href')
      expect(href).toBe('/login')
    }
  })

  test('Heading is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(
      page.getByRole('heading', { name: /forgot|password|recover/i }).first(),
    ).toBeVisible()
  })
})
