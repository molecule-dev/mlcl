import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, signup } from './_helpers.js'

const PUBLIC_PAGES = ['/', '/pricing', '/about', '/help', '/terms', '/privacy', '/login', '/signup']
const AUTH_PAGES = [
  '/admin',
  '/admin/dashboard',
  '/admin/listings',
  '/admin/listings/new',
  '/admin/leads',
  '/admin/showings',
  '/admin/analytics',
  '/admin/settings',
  '/notifications',
]

test.describe('Page invariants', () => {
  test('Every public page renders without console.error', async ({ page }) => {
    for (const path of PUBLIC_PAGES) {
      const errs: string[] = []
      const handler = (msg: import('@playwright/test').ConsoleMessage) => {
        if (msg.type() === 'error') errs.push(`[${path}] ${msg.text()}`)
      }
      page.on('console', handler)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      // Drain any post-load microtasks that fire console.error.
      await page.waitForTimeout(500)
      page.off('console', handler)
      const fatal = errs.filter(
        (e) => !/favicon|net::ERR_|Failed to load resource|aborted|signal aborted|401|403/i.test(e),
      )
      expect(fatal, `Console errors on ${path}: ${fatal.join(' | ')}`).toEqual([])
      // Page must render some text content
      const visible = await page.locator('body').innerText()
      expect(visible.trim().length, `${path} should render some text`).toBeGreaterThan(0)
    }
  })

  test('Every auth-guarded page renders for an authenticated user', async ({ page }) => {
    await signup(page)
    for (const path of AUTH_PAGES) {
      const errs: string[] = []
      const handler = (msg: import('@playwright/test').ConsoleMessage) => {
        if (msg.type() === 'error') errs.push(`[${path}] ${msg.text()}`)
      }
      page.on('console', handler)
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
      page.off('console', handler)
      // We should NOT have been bounced to /login.
      expect(page.url(), `${path} should not redirect to /login while authenticated`).not.toMatch(
        /\/login/,
      )
      const fatal = errs.filter(
        (e) => !/favicon|net::ERR_|Failed to load resource|aborted|signal aborted|401|403/i.test(e),
      )
      expect(fatal, `Console errors on ${path}: ${fatal.join(' | ')}`).toEqual([])
    }
  })

  test('GET /api/health returns 200 (or absent if app omits the route)', async () => {
    const ctx = await apiContext()
    const resp = await ctx.get(`${API_BASE.replace(/\/api$/, '')}/health`)
    expect([200, 204, 404]).toContain(resp.status())
  })
})
