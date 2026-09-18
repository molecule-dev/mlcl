import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/assets (Assets)', () => {
  test('renders the Assets heading and fetches /api/assets + /api/assets/summary', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/assets')
      await expect(page.getByRole('heading', { name: /Assets/i, level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    const list = reqs.find((r) => /\/api\/assets(?:\?|$)/.test(r.url) && r.method === 'GET')
    const summary = reqs.find((r) => /\/api\/assets\/summary/.test(r.url) && r.method === 'GET')
    expect(list, 'GET /api/assets fired').toBeTruthy()
    expect(list!.status).toBeLessThan(300)
    expect(summary, 'GET /api/assets/summary fired').toBeTruthy()
    expect(summary!.status).toBeLessThan(300)
  })

  test('All filter is rendered and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^All$/i })
    await expect(btn).toBeVisible()
    await btn.click()
  })

  test('Images filter is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^Images$/i })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('SVG filter is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^SVG$/i })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('Video filter is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^Video$/i })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('Audio filter is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^Audio$/i })
    await btn.click()
    await expect(btn).toBeVisible()
  })

  test('Fonts filter is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    const btn = page.getByRole('button', { name: /^Fonts$/i })
    await btn.click()
    await expect(btn).toBeVisible()
  })
})
