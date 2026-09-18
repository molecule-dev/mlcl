import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMe, signup, uniqueEmail } from './_helpers.js'

test.describe('/settings', () => {
  test('shell renders', async ({ page }) => {
    await signup(page, uniqueEmail('set-shell'))
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test=settings-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('display-name input accepts text', async ({ page }) => {
    await signup(page, uniqueEmail('set-name'))
    await page.goto(APP_BASE + '/settings')
    const name = page.locator('[data-test=settings-name]')
    await expect(name).toBeVisible({ timeout: 15_000 })
    await name.fill('New Name')
    await expect(name).toHaveValue('New Name')
  })

  test('email field is editable', async ({ page }) => {
    const email = uniqueEmail('set-email')
    await signup(page, email)
    await page.goto(APP_BASE + '/settings')
    const emailField = page.locator('[data-test=settings-email]')
    await expect(emailField).toBeVisible({ timeout: 15_000 })
    // Email became editable in the settings form (it is PATCHed alongside the
    // name by Save changes) — assert it is NOT read-only.
    await expect(emailField).not.toHaveAttribute('readonly', /.*/)
    await expect(emailField).toBeEditable()
    await expect(emailField).toHaveValue(email)
  })

  test('toggling email-alerts switch flips aria-checked', async ({ page }) => {
    await signup(page, uniqueEmail('set-toggle'))
    await page.goto(APP_BASE + '/settings')
    const toggle = page.locator('[data-test=settings-toggle-email_alerts]')
    await expect(toggle).toBeVisible({ timeout: 15_000 })
    const before = await toggle.getAttribute('aria-checked')
    await toggle.click()
    const after = await toggle.getAttribute('aria-checked')
    expect(after).not.toBe(before)
  })

  test('selecting EUR currency makes its chip active', async ({ page }) => {
    await signup(page, uniqueEmail('set-cur'))
    await page.goto(APP_BASE + '/settings')
    const eur = page.locator('[data-test=settings-currency-EUR]')
    await expect(eur).toBeVisible({ timeout: 15_000 })
    await eur.click()
    await expect(eur).toHaveClass(/bg-primary|active|on-primary/)
  })

  test('save persists name to /api/users/:id (PATCH)', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('set-save'))
    expect(userId).toBeTruthy()
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test=settings-page]')).toBeVisible({ timeout: 15_000 })
    await page.locator('[data-test=settings-name]').fill('Persisted Name')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=settings-save]').click()
      await page.waitForTimeout(1500)
    })
    const patch = reqs.find(
      (r) => new RegExp(`/api/users/${userId}$`).test(r.url) && r.method === 'PATCH',
    )
    expect(patch?.status, 'PATCH /api/users/:id').toBe(200)
    const me = await getMe(page, accessToken, userId)
    expect(me.name).toBe('Persisted Name')
  })

  test('"Manage plan" link navigates to /settings/billing', async ({ page }) => {
    await signup(page, uniqueEmail('set-billing'))
    await page.goto(APP_BASE + '/settings')
    await page
      .getByRole('link', { name: /manage.*plan|billing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/settings\/billing/)
  })
})
