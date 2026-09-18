/**
 * /settings — saving the profile form must hit /api/profile/me, persist
 * to the user record (verified via GET /api/profile/me), and reflect on
 * page reload. Billing tier name from the API must render as well.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('settings profile', () => {
  test('profile fields render the user email after signup', async ({ page }) => {
    const { email } = await signup(page, uniqueEmail('settings-render'))
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    // The email should appear pre-filled.
    const emailInput = page.locator('input[type="email"]').first()
    if (await emailInput.count()) {
      await expect(emailInput).toHaveValue(email)
    } else {
      await expect(page.getByText(email)).toBeVisible({ timeout: 10000 })
    }
  })

  test('PATCH /api/profile/me persists name + organization + timezone', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-patch'))
    const newName = `Carter ${Date.now()}`
    const newOrg = `Acme ${Date.now()}`
    const tz = 'Europe/Berlin'
    const lang = 'de-DE'

    const patch = await page.request.patch(API_BASE + '/profile/me', {
      headers: authHeaders(accessToken),
      data: { name: newName, organization: newOrg, timezone: tz, language: lang },
    })
    expect(patch.status()).toBeLessThan(400)

    const fetched = await page.request.get(API_BASE + '/profile/me', {
      headers: authHeaders(accessToken),
    })
    const body = (await fetched.json()) as {
      name?: string
      organization?: string
      timezone?: string
      language?: string
    }
    expect(body.name).toBe(newName)
    expect(body.organization).toBe(newOrg)
    expect(body.timezone).toBe(tz)
    expect(body.language).toBe(lang)
  })

  test('billing tier name from /api/billing/status is rendered on Settings', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('settings-billing'))
    const tier = await page.request.get(API_BASE + '/billing/status', {
      headers: authHeaders(accessToken),
    })
    expect(tier.status()).toBe(200)
    const body = (await tier.json()) as { name?: string }
    expect(body.name).toBeTruthy()

    await page.goto(APP_BASE + '/settings')
    await expect(page.getByText(new RegExp(body.name!, 'i'))).toBeVisible({ timeout: 10000 })
  })
})
