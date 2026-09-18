import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('profile page', () => {
  test('shows the user identity, safety number, and at least one device', async ({ page }) => {
    const { name, email } = await signup(page, uniqueEmail('profile'))
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(email, { exact: false }).first()).toBeVisible()
    await expect(page.getByText(/safety number/i).first()).toBeVisible()
    await expect(page.getByText(/this device/i).first()).toBeVisible()
  })

  test('updating the status PATCHes /api/profile/me and persists across reload', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('profile-edit'))
    await page.goto(APP_BASE + '/profile')
    const status = `Status updated at ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      const field = page.getByLabel(/status/i).first()
      await field.fill(status)
      await page.getByRole('button', { name: /save/i }).first().click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some(
        (r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url) && r.status === 200,
      ),
    ).toBeTruthy()
    await page.reload()
    await expect(page.getByLabel(/status/i).first()).toHaveValue(status)
  })
})
