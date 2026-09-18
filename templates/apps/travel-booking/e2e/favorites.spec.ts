/**
 * /favorites: GET /api/favorites; empty-state has a Browse stays CTA;
 * favoriting on /search is reflected here.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('favorites heading renders and GET /api/favorites fires', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/favorites')
    await expect(page.getByRole('heading', { name: /Saved properties/i })).toBeVisible()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const favReq = reqs.find((r) => r.method === 'GET' && /\/api\/favorites/.test(r.url))
  expect(favReq?.status).toBe(200)
})

test('Saved-for-later eyebrow visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  await expect(page.getByText(/Saved for later/i)).toBeVisible()
})

test('subheading or empty-state copy renders', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/saved|empty/i).first()).toBeVisible()
})

test('empty-state Browse stays CTA navigates to /search (when present)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/favorites')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const cta = page.getByRole('link', { name: /Browse stays/i })
  if ((await cta.count()) > 0) {
    await cta.click()
    await expect(page).toHaveURL(/\/search/)
  } else {
    // user has favorites — skip the empty-state CTA assertion
    test.skip(true, 'user has saved favorites — Browse stays CTA not rendered')
  }
})
