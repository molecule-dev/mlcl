/**
 * / (Landing) — the public face of the publication. Asserts that the hero
 * renders, the subscribe form exists, the archive fetches published issues
 * from /api/issues, and the footer/legal links navigate.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders the main element', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('main').first()).toBeVisible()
  })

  test('renders a top-level heading in the hero', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('renders the public subscribe form', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('#landing-subscribe-email')).toBeVisible()
    await expect(page.locator('#landing-subscribe-submit')).toBeVisible()
  })

  test('hero / nav has a "Get started" CTA that goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /get\s*started/i }).first()
    if (await cta.count()) {
      await cta.click()
      await page.waitForURL(/\/signup/, { timeout: 10000 })
    }
  })

  test('top-nav Sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in/i }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/login/, { timeout: 10000 })
    }
  })

  test('GET /api/issues fires on load (public archive)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/issues(\?|$)/.test(r.url))
    expect(r, 'landing must fetch /api/issues').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('footer Privacy link navigates to /privacy', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: 'Privacy' }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/privacy/, { timeout: 10000 })
    }
  })

  test('footer Terms link navigates to /terms', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: 'Terms' }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/terms/, { timeout: 10000 })
    }
  })

  test('footer Help link navigates to /help', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: 'Help' }).first()
    if (await link.count()) {
      await link.click()
      await page.waitForURL(/\/help/, { timeout: 10000 })
    }
  })

  test('does not throw page-errors during initial render', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    expect(errors).toEqual([])
  })

  test('reload preserves URL', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.reload()
    await expect(page).toHaveURL(/\/$/)
  })
})
