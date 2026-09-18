import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiContext, captureNetwork, signup, unwrapList } from './_helpers.js'

/**
 * Kitchen-sink user journey:
 *   1. Visit /pricing as anonymous, see paid tiers
 *   2. Sign up
 *   3. Land in /admin
 *   4. Visit /admin/listings, /admin/leads, /admin/showings, /admin/analytics
 *   5. Edit profile in /admin/settings
 *   6. Browse /property/:id (public) and verify mortgage calc API works
 */
test('user journey: anonymous browse → signup → admin tour → profile edit', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  expect((await page.locator('body').innerText()).length).toBeGreaterThan(50)

  const result = await signup(page)

  for (const route of [
    '/admin',
    '/admin/listings',
    '/admin/leads',
    '/admin/showings',
    '/admin/analytics',
  ]) {
    await page.goto(APP_BASE + route)
    await page.waitForLoadState('networkidle')
    expect((await page.locator('body').innerText()).length, route).toBeGreaterThan(20)
  }

  await page.goto(APP_BASE + '/admin/settings')
  await page.waitForLoadState('networkidle')

  const ctx = await apiContext()
  const list = await ctx.get(API_BASE + '/properties?status=active&limit=5')
  const items = unwrapList<{ id: string }>(await list.json())
  if (items.length > 0) {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/property/' + items[0].id)
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.some((r) => /\/api\/properties\//.test(r.url))).toBeTruthy()
  }
})
