import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/privacy', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
  })

  test('renders the privacy main landmark', async ({ page }) => {
    await expect(page.getByTestId('privacy-page')).toBeVisible()
  })

  test('renders the H1 "Privacy notice"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /privacy notice/i })).toBeVisible()
  })

  test('renders the H2 "What we store"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /what we store/i })).toBeVisible()
  })

  test('renders the H2 "Who can see your data"', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 2, name: /who can see your data/i }),
    ).toBeVisible()
  })

  test('renders the H2 "Your controls"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /your controls/i })).toBeVisible()
  })

  test('lists 4 specific data-collection bullets under "What we store"', async ({ page }) => {
    const items = page.locator('main[data-testid=privacy-page] ul li')
    await expect(items).toHaveCount(4)
  })

  test('back-to-home link navigates to /', async ({ page }) => {
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL(APP_BASE + '/')
  })

  test('does not call /api/* (static page) — gate-12 captureNetwork sentinel', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.url.includes('/api/'))).toEqual([])
  })
})
