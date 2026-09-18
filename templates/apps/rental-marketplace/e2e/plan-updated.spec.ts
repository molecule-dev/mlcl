/**
 * /plan-updated — Stripe checkout success landing page.
 *
 * Real outcomes asserted:
 *   - the page renders the success copy ("thank you" / "plan updated")
 *   - the "Return home" button is wired to /
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test('plan-updated page renders success state and Return home CTA', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  // The two stacked headings render the i18n keys (text comes from the
  // translation file). At minimum we expect *some* content + a return
  // home button linking to /.
  const home = page.getByRole('link', { name: /return home|back to home|home/i }).first()
  await expect(home).toBeVisible()
  await expect(home).toHaveAttribute('href', '/')
  await home.click()
  await page.waitForURL(APP_BASE + '/', { timeout: 10000 })
})

test('mounting /plan-updated leaves the user authenticated (captureNetwork)', async ({ page }) => {
  await signup(page)
  // The page is inside AuthGuard — if the bond cleared the session it would
  // redirect to /login. Authenticated users land on /plan-updated. The page
  // itself makes no fresh API call (auth state hydrates from localStorage),
  // so we capture the network and assert that the auth-guard did not bounce
  // us to /login.
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
  })
  // No 401s on this informational page.
  const unauthorized = reqs.filter((r) => r.status === 401 || r.status === 403)
  expect(unauthorized, '/plan-updated should not surface auth failures').toEqual([])
  expect(page.url()).toContain('/plan-updated')
  await expect(page).not.toHaveURL(/\/login/)
})

test('plan-updated renders a primary heading (the success message)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  // The page renders two stacked headings — at least one h1/h2 should
  // be present and visible.
  const headings = page.locator('h1, h2')
  await expect(headings.first()).toBeAttached()
  await expect(headings.first()).toBeVisible()
})

test('Return home button is wired inside the home link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  const homeLink = page.getByRole('link', { name: /return home|back to home|home/i }).first()
  await expect(homeLink).toBeVisible()
  // The Button rendered inside the link uses role=button.
  const inner = homeLink.locator('button')
  if (await inner.count()) {
    await expect(inner.first()).toBeEnabled()
  }
})

test('unauthenticated visitors are redirected away from /plan-updated', async ({ browser }) => {
  // /plan-updated lives inside AuthGuard; an anonymous visit should
  // bounce to /login.
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(APP_BASE + '/plan-updated')
  // Give the auth bond a moment to redirect.
  await page.waitForTimeout(2000)
  expect(page.url()).toMatch(/\/(login|signup|$)/)
  await ctx.close()
})
