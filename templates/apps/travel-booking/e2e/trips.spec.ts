/**
 * /trips: GET /api/trips and switch between Upcoming / Past tabs.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('trips heading renders + GET /api/trips fires', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/trips')
    await expect(page.getByRole('heading', { name: /^Trips$/i })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const tripsReq = reqs.find((r) => r.method === 'GET' && /\/api\/trips/.test(r.url))
  expect(tripsReq?.status).toBe(200)
})

test('Your wanders eyebrow visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trips')
  await expect(page.getByText(/Your wanders/i)).toBeVisible()
})

test('Upcoming tab is selectable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trips')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const tab = page.getByRole('tab', { name: /Upcoming/i })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
})

test('Past tab is selectable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trips')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const tab = page.getByRole('tab', { name: /Past/i })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
})

test('Plan another trip CTA navigates to /search', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/trips')
  await page.getByRole('link', { name: /Plan another trip/i }).click()
  await expect(page).toHaveURL(/\/search/)
})
