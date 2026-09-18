import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms', () => {
  test('Renders a heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Page text mentions terms-related vocabulary — proves real content', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const body = await page.textContent('body')
    expect(body, 'body text exists').toBeTruthy()
    expect(body!.toLowerCase()).toMatch(/terms|service|agreement|conditions/)
  })

  test('Renders without 4xx/5xx', async ({ page }) => {
    const failedReqs: number[] = []
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().includes('/terms')) failedReqs.push(r.status())
    })
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    expect(failedReqs).toEqual([])
  })
})
