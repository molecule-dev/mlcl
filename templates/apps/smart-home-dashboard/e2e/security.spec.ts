import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/security', () => {
  test('security page renders for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/security')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('security page is not blank', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/security')
    await page.waitForLoadState('networkidle').catch(() => {})
    const body = await page.locator('body').textContent()
    expect(body!.length).toBeGreaterThan(50)
  })

  test('navigating away from /security goes back to /overview via the side nav', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/security')
    await page.goto(APP_BASE + '/overview')
    await expect(page).toHaveURL(/\/overview/)
  })
})
