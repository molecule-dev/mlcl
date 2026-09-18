import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password — Reset link request', () => {
  test('renders email input + submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /(reset|send|email|continue)/i }).first(),
    ).toBeVisible()
  })

  test('Submitting an email returns success (regardless of registration) and the request actually fires', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#email').fill(uniqueEmail('forgot'))
      await page
        .getByRole('button', { name: /(reset|send|email|continue)/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    const forgotCall = reqs.find(
      (r) =>
        r.method === 'POST' && /forgot-password|password.reset|reset.password|forgot/i.test(r.url),
    )
    expect(forgotCall, 'forgot-password POST must fire').toBeTruthy()
    expect(forgotCall!.status).toBeLessThan(500)
  })

  test('Submitting for a registered user fires forgot-password endpoint with that email', async ({
    page,
  }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/forgot-password')
    let postBody: unknown = null
    await page.route('**/forgot-password*', (route) => {
      try {
        postBody = route.request().postDataJSON()
      } catch {
        postBody = null
      }
      route.continue()
    })
    await page.locator('input#email').fill(email)
    await page
      .getByRole('button', { name: /(reset|send|email|continue)/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    expect(postBody, 'request body captured').toBeTruthy()
    expect((postBody as { email: string }).email).toBe(email)
  })

  test('Has a "back to sign in" link', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const link = page.getByRole('link', { name: /(sign in|back|login)/i }).first()
    await expect(link).toBeVisible()
  })
})
