/**
 * /, the public landing page.
 * Asserts the page renders, featured tutors load from real DB rows,
 * subject quick-filters route to /search?subject=…, theme toggle survives
 * a reload, and the language switcher updates <html lang>.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  BRAND,
  captureNetwork,
  flipThemeAndAssertSurvivesReload,
  getTutors,
  readThemeAttr,
} from './_helpers.js'

test('landing page renders the hero, search, and CTAs', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    new RegExp(`Where curious minds meet|${BRAND}|tutor`, 'i'),
  )
  await expect(page.getByRole('link', { name: /find tutors/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /pricing/i }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
})

test('featured tutors load from /api/tutors and render the live catalog', async ({ page }) => {
  // The featured names are read from the same endpoint (and limit) the page
  // reads, so this still proves the live API was consulted once the demo
  // tutors have been replaced with real ones.
  const featured = await getTutors(page, '?limit=3')
  expect(featured.length).toBeGreaterThan(0)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const tutorsCall = reqs.find((r) => r.method === 'GET' && /\/api\/tutors($|\?)/.test(r.url))
  expect(tutorsCall, 'GET /api/tutors during landing page load').toBeDefined()
  expect(tutorsCall?.status).toBe(200)

  await expect(page.getByText(featured[0]!.display_name).first()).toBeVisible({ timeout: 10_000 })
})

test('subject quick-filter button navigates to /search with subject param', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('button', { name: /^math$/i })
    .first()
    .click()
  await page.waitForURL(/\/search/, { timeout: 10_000 })
  expect(page.url()).toMatch(/subject=math/i)
})

test('Browse all tutors link navigates to /search', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /browse all tutors/i })
    .first()
    .click()
  await page.waitForURL(/\/search/, { timeout: 10_000 })
})

test('toggle theme flips html attribute AND survives reload', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await flipThemeAndAssertSurvivesReload(page)
})

test('hero search submits to /search?q=…', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('input[type="text"]').first().fill('physics')
  await page
    .getByRole('button', { name: /find tutor/i })
    .first()
    .click()
  await page.waitForURL(/\/search/, { timeout: 10_000 })
  expect(page.url()).toMatch(/q=physics/i)
})

test('theme toggle attribute differs from initial', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const before = await readThemeAttr(page)
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await expect.poll(async () => readThemeAttr(page), { timeout: 8000 }).not.toBe(before)
})

test('Brand logo link routes back to /', async ({ page }) => {
  await page.goto(APP_BASE + '/search')
  await page
    .getByRole('link', { name: new RegExp(`^${BRAND}$`, 'i') })
    .first()
    .click()
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
})

test('brand "Teach on" link link points to /become-tutor (auth-gated)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const link = page.getByRole('link', { name: new RegExp(`teach on ${BRAND}`, 'i') }).first()
  const href = await link.getAttribute('href')
  expect(href).toBe('/become-tutor')
  await link.scrollIntoViewIfNeeded()
  await link.click()
  // Unauthenticated users are auth-gated to /login; signed-in users land on /become-tutor
  await page.waitForURL(/\/(become-tutor|login)/, { timeout: 15_000 })
})

test('"Get started" link routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /get started/i })
    .first()
    .click()
  await page.waitForURL(/\/signup/, { timeout: 10_000 })
})

test('"Sign in" link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /sign in/i })
    .first()
    .click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
})

test('"Pricing" link in nav routes to /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /pricing/i })
    .first()
    .click()
  await page.waitForURL(/\/pricing/, { timeout: 10_000 })
})

test('"Apply to teach" link points to /become-tutor (auth-gated)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  // The "Apply to teach" CTA is in a tutor-recruit section near page bottom.
  // /become-tutor is auth-gated, so unauthenticated visitors land on /login.
  // Both destinations are valid — assert the link's href is correct, then
  // confirm the click leads us out of /.
  const apply = page.getByRole('link', { name: /apply to teach/i }).first()
  await expect(apply).toHaveCount(1)
  const href = await apply.getAttribute('href')
  expect(href).toBe('/become-tutor')
  await apply.scrollIntoViewIfNeeded()
  await apply.click({ force: true })
  await page.waitForURL(/\/(become-tutor|login)/, { timeout: 15_000 })
})

test('clicking a featured tutor card routes to /tutor/:id', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const featuredLink = page.locator('a[href*="/tutor/"]').first()
  if (await featuredLink.count()) {
    await featuredLink.click()
    await page.waitForURL(/\/tutor\//, { timeout: 10_000 })
  }
})
