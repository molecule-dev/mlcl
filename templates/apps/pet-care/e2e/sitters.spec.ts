import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedGet, captureNetwork, signup } from './_helpers.js'

test.describe('sitters list page', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/sitters')
  })

  test('renders a heading', async ({ page }) => {
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
  })

  test('mount fires GET /api/sitters and seeded sitters render', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    await signup(p2)
    const reqs = await captureNetwork(p2, async () => {
      await p2.goto(APP_BASE + '/sitters')
      await p2.waitForTimeout(2000)
    })
    expect(reqs.some((r) => r.method === 'GET' && /\/api\/sitters\b/.test(r.url))).toBeTruthy()
    const sitters = (await authedGet(p2, '/sitters')) as Array<{ display_name: string }>
    expect(sitters.length, 'seeded sitters present').toBeGreaterThan(0)
    await expect(p2.getByText(sitters[0].display_name).first()).toBeVisible()
    await fresh.close()
  })

  test('typing in search keeps the URL on /sitters', async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first()
    if (await search.count().catch(() => 0)) {
      await search.fill('walk')
      await page.waitForTimeout(400)
      await expect(page).toHaveURL(/\/sitters(?:\?|$)/)
    }
  })
})
