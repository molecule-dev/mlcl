/**
 * /notifications — empty state, seeded notifications appear after a
 * Send action.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, seedContract } from './_helpers.js'

test.describe('notifications', () => {
  test('renders empty state for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/notifications')
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible()
    await expect(page.getByText(/No new notifications/i)).toBeVisible()
  })

  test('shows notification after sending a contract', async ({ page }) => {
    const { accessToken } = await signup(page)
    const c = await seedContract(page, accessToken, { title: 'Notify Test' })
    await page.goto(`${APP_BASE}/contracts/${c.id}`)
    await page.waitForLoadState('networkidle')
    await page.locator('#send-for-signature').click()
    await page.waitForTimeout(500)
    await page.goto(APP_BASE + '/notifications')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/Sent.*Notify Test/i)).toBeVisible({ timeout: 10_000 })
  })
})
