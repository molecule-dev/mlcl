import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('plan-updated /plan-updated', () => {
  test('page loads and renders a confirmation message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const heading = page.getByText(/plan|updated|thanks|welcome/i).first()
    await expect(heading).toBeVisible({ timeout: 10_000 })
  })

  test('return-home / return-to-app link is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const back = page.getByRole('link').or(page.getByRole('button')).first()
    await expect(back.first()).toBeAttached()
  })

  test('no failed network calls on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      await page.waitForLoadState('networkidle')
    })
    const failed = reqs.filter((r) => r.status >= 500)
    expect(failed).toHaveLength(0)
  })

  test('navigating away to /library succeeds', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.goto(APP_BASE + '/library')
    await expect(page).toHaveURL(/\/library/)
  })
})
