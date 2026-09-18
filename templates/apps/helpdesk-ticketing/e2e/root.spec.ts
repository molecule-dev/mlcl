import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('helpdesk-ticketing: / (dashboard root)', () => {
  test('authed user sees the dashboard heading and primary nav', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('link', { name: /tickets/i }).first()).toBeVisible()
  })

  test('mount fans out to /api/tickets and /api/users/me', async ({ page }) => {
    const session = await signup(page)
    expect(session.accessToken.length).toBeGreaterThan(20)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const paths = reqs.map((r) => r.url.replace(/^https?:\/\/[^/]+/, ''))
    expect(
      paths.some((p) => p.startsWith('/api/tickets')),
      `dashboard mount must GET /api/tickets — saw ${paths.slice(0, 8).join(', ')}`,
    ).toBe(true)
    expect(
      paths.some((p) => p.includes('/api/users/me')),
      `dashboard mount must hydrate the agent profile via /api/users/me — saw ${paths.slice(0, 8).join(', ')}`,
    ).toBe(true)
  })

  test('unauthed / redirects to /login', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('unauthed /tickets redirects to /login (regression on AuthGuard)', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/tickets')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
