/**
 * /account: profile, wander club, payment methods, and preferences
 * sub-sections, plus PATCH /api/profile/me + POST /api/profile/payment-methods.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('account heading renders for an authenticated user and GET /api/profile/me fires', async ({
  page,
}) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/account')
    await expect(page.getByRole('heading', { name: /^Account$/i })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const profileGet = reqs.find((r) => r.method === 'GET' && /\/api\/profile\/me/.test(r.url))
  expect(profileGet?.status).toBe(200)
})

test('Profile sub-nav button is interactive', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const btn = page.locator('[data-testid="account-section-profile"]')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-current', 'page')
})

test('Payments sub-nav switches to payment methods view', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="account-section-payments"]').click()
  await expect(page.getByRole('heading', { name: /Payment methods/i })).toBeVisible()
})

test('Wander Club sub-nav switches to loyalty view', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="account-section-wanderClub"]').click()
  await expect(page.locator('[data-testid="account-wander-club"]')).toBeVisible()
})

test('Preferences sub-nav button toggles aria-current=page', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const btn = page.locator('[data-testid="account-section-preferences"]')
  await btn.click()
  await expect(btn).toHaveAttribute('aria-current', 'page')
})

test('add-payment button POSTs /api/profile/payment-methods', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/account')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await page.locator('[data-testid="account-section-payments"]').click()
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-testid="account-add-payment"]').click()
    await page.waitForTimeout(2_000)
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/profile\/payment-methods/.test(r.url),
  )
  expect(post).toBeTruthy()
})
