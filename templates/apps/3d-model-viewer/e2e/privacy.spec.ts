import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy', () => {
  test('Renders a heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('Page text mentions "privacy" or "data" — proves real content rendered', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/privacy')
    const body = await page.textContent('body')
    expect(body, 'body text exists').toBeTruthy()
    expect(body!.toLowerCase()).toMatch(/privacy|data|information/)
  })

  test('Renders without 4xx/5xx', async ({ page }) => {
    const failedReqs: number[] = []
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().includes('/privacy')) failedReqs.push(r.status())
    })
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    expect(failedReqs).toEqual([])
  })
})
