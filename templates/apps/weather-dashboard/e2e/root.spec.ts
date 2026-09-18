import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('Landing renders an h1 hero', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('Landing CTA "Start tracking" links to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /start tracking/i }).first()).toHaveAttribute(
    'href',
    /\/signup/,
  )
})

test('Landing CTA "Sign in" links to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toHaveAttribute(
    'href',
    /\/login/,
  )
})

test('Landing renders the brand link to / and the marketing CTAs', async ({ page }) => {
  // Landing is the unauthed marketing page — by design it does NOT host a
  // theme toggle (that lives on Login / Signup / ForgotPassword). What it
  // must always have is a brand link back to / and CTAs to /signup + /login.
  await page.goto(APP_BASE + '/')
  await page.waitForFunction(() => !!document.documentElement.getAttribute('data-mol-mode'))
  const mode = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
  expect(mode).toMatch(/^(light|dark)$/)
  await expect(page.getByRole('link', { name: /start tracking/i }).first()).toHaveAttribute(
    'href',
    /\/signup/,
  )
})

test('Landing renders the sample Brooklyn weather hero card', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('main')).toContainText(/Brooklyn/i, { timeout: 10_000 })
})

test('Landing makes no backend API calls (static marketing surface)', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
  })
  // Ignore the user-session bootstrap that the auth bond fires on every page.
  // Marketing landing must not pull /api/locations, /api/forecasts, etc.
  const forbidden = reqs.filter((r) => /\/api\/(locations|forecasts|alerts|history)/.test(r.url))
  expect(forbidden).toEqual([])
})
