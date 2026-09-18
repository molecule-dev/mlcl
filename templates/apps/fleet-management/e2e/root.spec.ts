import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing (/)', () => {
  test('hero heading "Command every mile" renders, page loaded over HTTP 200', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(
        page.getByRole('heading', { level: 1, name: /command every mile/i }),
      ).toBeVisible()
    })
    // The SPA shell GET (any 200 response from APP_BASE root) confirms the public route is reachable.
    const root = reqs.find((r) => r.url.endsWith(APP_BASE + '/') || r.url === APP_BASE + '/')
    expect(root?.status, 'GET /').toBe(200)
  })

  test('"Get a demo" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /get a demo/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" CTA navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('logo link points to / (home)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const logo = page.getByRole('link', { name: /^bearing$/i }).first()
    await expect(logo).toHaveAttribute('href', '/')
  })

  test('feature cards (live map, smart alerts, maintenance, driver scores) render', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /live fleet map/i, level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /smart alerts/i, level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /maintenance ahead/i, level: 3 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /driver scores/i, level: 3 })).toBeVisible()
  })
})
