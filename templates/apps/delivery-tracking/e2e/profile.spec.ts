import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/profile', () => {
  test('renders the profile heading and identity panel', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await expect(page.getByRole('heading', { name: /^Profile$/i })).toBeVisible()
      await expect(page.locator('[data-mol-id="form-identity"]')).toBeVisible()
    })
    const userReq = reqs.find((r) => r.method === 'GET' && /\/api\/users\/[\w-]+$/.test(r.url))
    expect(userReq, 'mount must hydrate via GET /api/users/:id').toBeTruthy()
    expect(userReq?.status).toBe(200)
  })

  test('email field is editable and matches the signed-up email', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const emailInput = page.locator('[data-mol-id="input-email"]')
    await expect(emailInput).toHaveValue(email, { timeout: 10_000 })
    // Email became editable in the profile form (it is PATCHed alongside the
    // name by Save changes) — assert it is NOT read-only.
    await expect(emailInput).not.toHaveAttribute('readonly', '')
    await expect(emailInput).toBeEditable()
  })

  test('saving display name shows the saved confirmation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const newName = `Renamed ${Date.now()}`
    await page.locator('[data-mol-id="input-name"]').fill(newName)
    await page.locator('[data-mol-id="button-save-profile"]').click()
    await expect(page.locator('[data-mol-id="profile-saved-pill"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Change password dialog opens, validates length, and closes on cancel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="button-change-password"]').click()
    await expect(page.locator('[data-mol-id="dialog-change-password"]')).toBeVisible()
    await page.locator('[data-mol-id="input-pw-current"]').fill('TestPass123!')
    await page.locator('[data-mol-id="input-pw-new"]').fill('short')
    await page.locator('[data-mol-id="input-pw-confirm"]').fill('short')
    await page.locator('[data-mol-id="button-pw-submit"]').click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
    await page.locator('[data-mol-id="button-pw-cancel"]').click()
    await expect(page.locator('[data-mol-id="dialog-change-password"]')).toBeHidden()
  })

  test('Enable 2FA dialog opens and disables submit until 6 digits', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="button-enable-2fa"]').click()
    await expect(page.locator('[data-mol-id="dialog-2fa"]')).toBeVisible()
    const submit = page.locator('[data-mol-id="button-2fa-submit"]')
    await expect(submit).toBeDisabled()
    await page.locator('[data-mol-id="input-2fa-code"]').fill('123456')
    await expect(submit).toBeEnabled()
    await page.locator('[data-mol-id="button-2fa-cancel"]').click()
    await expect(page.locator('[data-mol-id="dialog-2fa"]')).toBeHidden()
  })
})
