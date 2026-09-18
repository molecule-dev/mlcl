import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders hero "Every mile, accounted for" headline', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    })
    // Landing should be a public marketing page — no API failures.
    const failures = reqs.filter((r) => r.url.startsWith(APP_BASE + '/api/') && r.status >= 500)
    expect(failures, 'landing page must not surface 5xx API errors').toEqual([])
  })

  test('Sign in link in nav goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Get a demo" CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Get a demo/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('renders the four feature cards', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Real-time across/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Exception alerts/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Webhooks/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Performance/i })).toBeVisible()
  })

  test('renders the brand name in the nav', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /Parcel/i }).first()).toBeVisible()
  })
})
