/**
 * / — public landing page. Renders nav, hero CTAs, command-palette
 * showcase card, dense list mockup, feature cards, and footer copyright.
 * No authentication required.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('initial load returns the SPA shell (200) without auth fetches', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const shell = reqs.find((r) => r.status === 200 && /\/$/.test(new URL(r.url).pathname))
    expect(shell).toBeTruthy()
    const authCalls = reqs.filter((r) => /\/api\/(profile|users|billing\/status)/.test(r.url))
    expect(authCalls).toHaveLength(0)
  })

  test('renders the hero leading + trailing copy', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /copy once/i, level: 1 })).toBeVisible()
    await expect(page.getByText(/find forever/i).first()).toBeVisible()
  })

  test('top nav has Sign in + Get Yank links', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /get yank|get clipboard/i }).first()).toBeVisible()
  })

  test('"Sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /sign in/i }).click()
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
  })

  test('"Get Yank" CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /get yank|get clipboard/i })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 10000 })
  })

  test('"Try in browser" hero CTA routes to /clips', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /try in browser/i }).click()
    await page.waitForURL('**/clips', { timeout: 10000 }).catch(async () => {
      // unauth user → redirected to login first
      await page.waitForURL(/\/(login|clips)/, { timeout: 10000 })
    })
  })

  test('feature section renders all four feature cards', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /search every snippet/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /sync across devices/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /command-palette first/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /encrypted by default/i })).toBeVisible()
  })

  test('footer renders the copyright with current year', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const year = new Date().getFullYear().toString()
    await expect(page.locator('footer').getByText(year)).toBeVisible()
  })
})
