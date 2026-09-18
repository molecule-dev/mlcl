/**
 * /pricing — Public pricing page rendered by @molecule/app-billing-react.
 * Three tier cards (Free / Pro / Team). Authed users see the current
 * plan as a disabled "Current plan" button.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('pricing page', () => {
  test('renders heading + three tier cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your.*plan/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Free$/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Pro$/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Team$/ })).toBeVisible()
  })

  test('Free tier card is present', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Free$/ })).toBeVisible()
  })

  test('Pro tier card is present', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Pro$/ })).toBeVisible()
  })

  test('Team tier card is present', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Team$/ })).toBeVisible()
  })

  test('a freshly-signed-up user shows "Current plan" on Free tier', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Current plan/ })).toBeVisible()
  })

  test('Upgrade buttons are present for Pro and Team tiers (visitor view)', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('button', { name: /Upgrade to Pro/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Upgrade to Team/ })).toBeVisible()
  })

  test('clicking "Upgrade to Pro" while authed POSTs /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/ }).click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/api\/billing\/checkout/.test(r.url) && r.method === 'POST')
    expect(post, JSON.stringify(reqs.map((r) => r.url))).toBeTruthy()
  })
})
