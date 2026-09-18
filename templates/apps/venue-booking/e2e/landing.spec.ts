/**
 * Landing page (/) — public marketing surface. Tests assert on the
 * *outcome* of each interactive element, not just that text is visible.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('landing renders Alcove brand, hero copy, and search card', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('link', { name: 'Alcove' }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /Every space, a story/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Search$/ })).toBeVisible()
})

test('hero search card submits and navigates to /search (guest is bounced to /login)', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/')
  await page.getByRole('button', { name: /^Search$/ }).click()
  // /search is auth-guarded — guest visitors land on /login instead.
  await expect(page).toHaveURL(/\/(search|login)/)
})

test('Hand-picked spaces section calls GET /api/venues and renders cards', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    // wait for the venues fetch to settle and rerender.
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const venuesGet = reqs.find((r) => r.method === 'GET' && /\/api\/venues(\?|$)/.test(r.url))
  expect(venuesGet?.status).toBe(200)

  // Once the fetch resolves, the section flips out of skeleton state and
  // shows cards. Each card surfaces a "/hr" or "/day" price suffix.
  await expect(page.getByText(/\/(hr|day)\b/).first()).toBeVisible({ timeout: 15_000 })
})

test('navigates to /login when "Sign in" clicked', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /Sign in/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('navigates to /signup when "Join Alcove" clicked', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /Join Alcove/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/signup/)
})

test('category tile hrefs include ?type= query', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  // assert on the link's href before clicking — a guest will be bounced
  // to /login by AuthGuard, so we can't assert post-navigation URL.
  const link = page.getByRole('link', { name: /Studios/i }).first()
  const href = await link.getAttribute('href')
  expect(href).toMatch(/\/search\?type=/)
})
