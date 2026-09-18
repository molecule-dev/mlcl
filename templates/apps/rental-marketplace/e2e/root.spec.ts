/**
 * / (Landing) — public marketing page.
 *
 * Asserts on:
 *   - hero CTAs land on /signup, /login, /search
 *   - destination cards link to /search?q=…
 *   - live preview row hits GET /api/listings?limit=6 and renders real data
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test('landing renders hero copy and CTAs that navigate', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /stay like you belong/i })).toBeVisible()
  await expect(page.getByRole('link', { name: /join roost/i })).toHaveAttribute('href', /\/signup/)
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toHaveAttribute(
    'href',
    /\/login/,
  )
  await expect(page.getByRole('link', { name: /find a stay/i }).first()).toHaveAttribute(
    'href',
    /\/search/,
  )
  await expect(page.getByRole('link', { name: /become a host/i }).first()).toHaveAttribute(
    'href',
    /\/host/,
  )
})

test('landing fetches /api/listings?limit=6 and renders real listing cards', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
  })
  const call = reqs.find((r) => /\/api\/listings/.test(r.url) && r.method === 'GET')
  expect(call, 'GET /api/listings should fire').toBeTruthy()
  expect(call!.status, 'listings call should succeed').toBe(200)

  // The preview row links should target /listings/<id>; at least one
  // should be visible after the network call resolves.
  const cards = page.locator('a[href^="/listings/"]')
  await expect(cards.first()).toBeVisible({ timeout: 10000 })
})

test('destination card links to /search with the destination prefilled', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const big = page.getByRole('link', { name: /Big Sur/i }).first()
  await expect(big).toHaveAttribute('href', /\/search\?q=/)
})

test('hero search submits to /search with query params', async ({ page }) => {
  // /search is auth-gated by AuthGuard, so unauthenticated users would
  // bounce to /login on submit. We sign up first to exercise the
  // intended happy path.
  await signup(page)
  await page.goto(APP_BASE + '/')
  const dest = page.getByPlaceholder(/city, region, or property/i)
  await dest.fill('Brooklyn')
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/search/, { timeout: 10000 })
  expect(page.url()).toMatch(/q=Brooklyn/)
})

test('live preview listing card on landing links to /listings/:id', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  const card = page.locator('a[href^="/listings/"]').first()
  await expect(card).toBeVisible({ timeout: 10000 })
  const href = await card.getAttribute('href')
  expect(href).toMatch(/^\/listings\/.+/)
})

test('host CTA in the landing band links to /host', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  const startHosting = page.getByRole('link', { name: /start hosting/i }).first()
  await expect(startHosting).toHaveAttribute('href', /\/host/)
})
