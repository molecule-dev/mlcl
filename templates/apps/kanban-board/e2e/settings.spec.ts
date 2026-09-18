import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signupViaUI } from './_helpers.js'

test.describe('settings', () => {
  test('profile section is visible', async ({ page }) => {
    await signupViaUI(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-profile')).toBeVisible()
  })

  test('email cell shows the user\u2019s real email', async ({ page }) => {
    const { email } = await signupViaUI(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-email')).toHaveText(email)
  })

  test('display-name cell shows the user\u2019s display name', async ({ page }) => {
    await signupViaUI(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-name')).toHaveText(/Driftboard Tester/)
  })

  test('plan section is visible', async ({ page }) => {
    await signupViaUI(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-plan')).toBeVisible()
  })

  test('GET /api/billing/status fires and the plan-key cell renders the returned plan', async ({
    page,
  }) => {
    await signupViaUI(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const call = reqs.find((r) => /\/api\/billing\/status/.test(r.url) && r.method === 'GET')
    expect(call, 'GET /api/billing/status should fire').toBeTruthy()
    expect(call!.status).toBe(200)
    await expect(page.getByTestId('settings-plan-key')).toHaveText(/free/i, { timeout: 8000 })
  })

  test('"Manage plan" link points at /pricing', async ({ page }) => {
    await signupViaUI(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-manage-plan')).toHaveAttribute('href', '/pricing')
  })
})
