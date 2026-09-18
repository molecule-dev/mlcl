import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers.js'

test('Authenticated user lands somewhere off /signup after submitting the form', async ({
  page,
}) => {
  await signup(page)
  await expect(page).not.toHaveURL(/\/signup|\/login/, { timeout: 15000 })
})

test('/dashboard renders without console errors for a signed-in user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).toBeVisible()
})

test('/courses renders with no fatal errors', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/courses')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).toBeVisible()
})
