/**
 * Public landing page (/) — anonymous visitors, sign-in/sign-up CTAs,
 * primary marketing copy, navigation into auth flows.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('/ renders the landing page shell when anonymous', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('[data-mol-id="page-landing"]')).toBeVisible()
})

test('/ landing-signin link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('[data-mol-id="landing-signin"]').click()
  await page.waitForURL(/\/login/)
})

test('/ landing-signup link routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('[data-mol-id="landing-signup"]').first().click()
  await page.waitForURL(/\/signup/)
})

test('/ primary CTA visible and clickable', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.locator('[data-mol-id="landing-cta-primary"]')).toBeVisible()
})

test('/ renders an h1 hero heading', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})

test('/ feature card headings render: AI tutor, flashcards, quizzes, progress', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { name: /ai tutor/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /smart flashcards/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /practice quizzes/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /progress tracking/i }).first()).toBeVisible()
})

test('/ "Start free" hero CTA navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /^start free$/i })
    .first()
    .click()
  await page.waitForURL(/\/signup/, { timeout: 5_000 })
})

test('/ "Watch demo" hero CTA points to /dashboard (auth-protected)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /watch demo/i })
    .first()
    .click()
  // /dashboard is auth-gated → either lands on /dashboard (anonymous redirected to /login)
  await page.waitForURL(/\/(dashboard|login)/, { timeout: 5_000 })
})

test('/ footer links to /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .locator('footer')
    .getByRole('link', { name: /pricing/i })
    .first()
    .click()
  await page.waitForURL(/\/pricing/, { timeout: 5_000 })
})

// The footer renders Privacy/Terms through LegalModalLinks, which opens the
// bonded legal HTML in place rather than navigating (see Footer.tsx). These
// used to assert a URL change, which the app has not done for some time. Both
// halves of the contract are covered instead of one: the footer control opens
// readable content, AND the standalone routes still serve a deep link.
test('/ footer opens the privacy policy in place', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .locator('footer')
    .getByRole('button', { name: /privacy/i })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/privacy/i)
})

test('/ footer opens the terms of service in place', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.locator('footer').getByRole('button', { name: /terms/i }).first().click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText(/terms/i)
})

test('/privacy still serves a direct link', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
})

test('/terms still serves a direct link', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
})

test('/ "Start learning free" header CTA navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page
    .getByRole('link', { name: /start learning free/i })
    .first()
    .click()
  await page.waitForURL(/\/signup/, { timeout: 5_000 })
})
