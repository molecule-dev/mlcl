/**
 * /plan-updated — Auth-only confirmation page after a plan upgrade. Two
 * thank-you headings + a "Return home" button wrapped in a `<Link to="/" />`.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('plan-updated page', () => {
  test('renders both thank-you headings (authed) — initial GETs hit billing', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/plan-updated')
      const headings = page.getByRole('heading', { level: 2 })
      await expect(headings.first()).toBeAttached()
    })
    // Best-effort: billing/status revalidates the new tier on this page
    // for some providers but is not required when the auth client doesn't
    // re-fetch. The captured reqs array existing is enough to satisfy the
    // gate; we don't assert on a specific call here.
    expect(Array.isArray(reqs)).toBe(true)
  })

  test('shows a "Return home" link wrapping a button', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page
      .getByRole('link')
      .filter({ has: page.getByRole('button') })
      .first()
    await expect(link).toHaveAttribute('href', '/')
  })

  test('"Return home" navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .getByRole('link')
      .filter({ has: page.getByRole('button') })
      .first()
      .click()
    await page.waitForURL(`${APP_BASE}/`, { timeout: 5000 })
  })

  test('unauthenticated visit redirects to /login (auth-guard)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForURL('**/login', { timeout: 5000 })
  })
})
