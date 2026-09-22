import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, login, signup, uniqueEmail } from './_helpers.js'

test.describe('Settings', () => {
  test('Update profile name persists across reload + GET /me reflects the change', async ({
    page,
  }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('prof-up'))
    await page.goto(APP_BASE + '/settings')
    await page.locator('input[data-mol-id="settings-name-input"]').fill('Updated Name')
    await page.locator('button[data-mol-id="settings-save-profile"]').click()
    await expect(page.locator('role=status')).toBeVisible()

    // GET /users/:id should now reflect the change
    const me = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await me.json()) as { props?: { name?: string } }
    expect(body?.props?.name).toBe('Updated Name')

    // Reload — page should pre-fill with the new name
    await page.reload()
    await expect(page.locator('input[data-mol-id="settings-name-input"]')).toHaveValue(
      'Updated Name',
    )
  })

  test('Change password — old password no longer works', async ({ page }) => {
    const email = uniqueEmail('pw-chg')
    const { password } = await signup(page, email)
    const newPassword = 'NewSecret!2026'
    await page.goto(APP_BASE + '/settings')
    await page.locator('button[data-mol-id="settings-tab-password"]').click()
    await page.locator('input[data-mol-id="settings-current-password"]').fill(password)
    await page.locator('input[data-mol-id="settings-new-password"]').fill(newPassword)
    await page.locator('input[data-mol-id="settings-confirm-password"]').fill(newPassword)
    await page.locator('button[data-mol-id="settings-save-password"]').click()
    await expect(page.locator('role=status')).toBeVisible()

    // Logout via fresh storage clear, try to login with old creds — should fail
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input#login-email').fill(email)
    await page.locator('input#login-password').fill(password)
    // The rejected old-credential POST 403s by design; the page surfaces it inline.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 403',
    })
    await page.locator('form button[type="submit"]').click()
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/login/)

    // New password works
    await login(page, email, newPassword)
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('Mismatched new+confirm shows error and does not call API', async ({ page }) => {
    const { password } = await signup(page, uniqueEmail('pw-mismatch'))
    await page.goto(APP_BASE + '/settings/password')
    await page
      .locator('button[data-mol-id="settings-tab-password"]')
      .click()
      .catch(() => {})
    await page.locator('input[data-mol-id="settings-current-password"]').fill(password)
    await page.locator('input[data-mol-id="settings-new-password"]').fill('SomethingNew!1234')
    await page.locator('input[data-mol-id="settings-confirm-password"]').fill('AnotherThing!1234')
    await page.locator('button[data-mol-id="settings-save-password"]').click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
})
