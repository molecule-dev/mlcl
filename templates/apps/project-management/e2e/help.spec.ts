/**
 * /help — anonymous FAQ page. Verifies it renders without auth, the
 * native <details>/<summary> accordion actually opens on click, and the
 * "Back to Dashboard" affordance routes correctly for a signed-in user.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('help page', () => {
  test('/help renders the FAQ topics for anonymous visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByRole('heading', { name: /help/i })).toBeVisible()
    await expect(page.locator('details').first()).toBeVisible()
  })

  test('/help — clicking a topic summary toggles the answer open', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    const first = page.locator('details').first()
    await expect(first).not.toHaveAttribute('open', '')
    await first.locator('summary').click()
    await expect(first).toHaveAttribute('open', '')
  })

  test('/help — Back to Dashboard navigates a signed-in user to /dashboard', async ({ page }) => {
    await signup(page, uniqueEmail('help-back'))
    await page.goto(APP_BASE + '/help')
    await page.getByTestId('help-go-dashboard').click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })
})
