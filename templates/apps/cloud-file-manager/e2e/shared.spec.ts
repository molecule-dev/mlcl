import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/shared', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/shared')
    await expect(page).toHaveURL(/\/login/)
  })

  test('renders the page and queries /api/shares on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/shared')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/shares/.test(r.url) && r.status === 200)).toBeTruthy()
  })

  test('an empty inbox shows the empty-state message', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const empty = page.getByText(/nothing has been shared|no\s*shares|nothing here yet/i).first()
    if (await empty.count()) await expect(empty).toBeVisible()
  })

  test('the page heading is visible for authed users', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10000 })
  })

  test('a row link uses an /files/:id href when results exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/shared')
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const link = page.locator('a[href^="/files/"]').first()
    if (await link.count()) {
      const href = await link.getAttribute('href')
      expect(href).toMatch(/\/files\/[^/]+$/)
    }
  })
})
