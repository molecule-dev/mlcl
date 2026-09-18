import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const email = page.locator('[data-mol-id="forgot-email"]')
    await email.fill('a@b.com')
    await expect(email).toHaveValue('a@b.com')
  })

  test('submitting an unknown email still returns a generic success (no enumeration)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('[data-mol-id="forgot-email"]').fill(uniqueEmail('nobody'))
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="forgot-submit"]').click()
      await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible()
    })
    expect(
      reqs.some((r) => /\/api\/users\/forgot-password$/.test(r.url) && r.method === 'POST'),
    ).toBeTruthy()
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .locator('[data-mol-id="forgot-back-link"]')
      .first()
      .or(page.getByRole('link', { name: /Back to sign in/i }).first())
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Submitting a real user email triggers POST /api/users/forgot-password and shows confirmation', async ({
    page,
    browser,
  }) => {
    // Register a fresh user in a separate context so we have a real email address.
    const ctxSignup = await browser.newContext()
    const pageSignup = await ctxSignup.newPage()
    const { email } = await signup(pageSignup, uniqueEmail('forgot'))
    await ctxSignup.close()

    // Drive the forgot-password flow on the video-enabled page fixture context.
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('[data-mol-id="forgot-email"]').fill(email)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="forgot-submit"]').click()
      await expect(page.locator('[data-mol-id="forgot-sent"]')).toBeVisible()
    })
    const success = reqs.find(
      (r) => /\/api\/users\/forgot-password$/.test(r.url) && r.method === 'POST',
    )
    expect(success).toBeTruthy()
    expect([200, 204]).toContain(success!.status)
  })
})
