import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('top nav Engram brand link points to landing root', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const brand = page.getByRole('link', { name: /^psychology Engram$|^Engram$/i }).first()
    await expect(brand).toBeVisible()
    expect(await brand.getAttribute('href')).toBe('/')
  })

  test('top-right Sign in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /^Sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('top-right Start studying free CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /Start studying free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero Start studying free goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('[data-mol-id="hero-cta-primary"]').click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero secondary "I already have an account" goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /I already have an account/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('final CTA "Start your first deck" goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Start your first deck/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('landing fires no /api/* call (static page)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, 'landing should be 100% static; no /api/* call').toEqual([])
  })
})
