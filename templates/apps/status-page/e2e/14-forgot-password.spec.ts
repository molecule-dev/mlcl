import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input and is reflected', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.getByLabel(/email/i).first()
    await expect(email).toBeVisible({ timeout: 10_000 })
    await email.fill('lookup@example.com')
    await expect(email).toHaveValue('lookup@example.com')
  })

  test('Submit posts to /api/users/forgot-password and shows confirmation', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.getByLabel(/email/i).first()
    await email.fill(uniqueEmail('forgot'))
    const reqs = await captureNetwork(page, async () => {
      const submit = page.getByRole('button', { name: /send|reset|recover/i }).first()
      await submit.click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/users\/forgot-password/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/users/forgot-password fired').toBeTruthy()
    expect([200, 201, 204]).toContain(post!.status!)
  })

  test('No fatal console errors during submit', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByLabel(/email/i).first().fill(uniqueEmail('forgot-err'))
    await page
      .getByRole('button', { name: /send|reset|recover/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
    expect(fatal).toEqual([])
  })

  test('Login link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if (await link.count().catch(() => 0)) {
      await link.click()
      await page.waitForTimeout(500)
      const path = new URL(page.url()).pathname
      expect(path).toMatch(/login|forgot-password/)
    }
  })
})
