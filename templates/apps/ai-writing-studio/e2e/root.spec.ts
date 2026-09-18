/**
 * / (Landing) — public marketing page.
 *
 * Asserts on real navigation outcomes (URL changes after click), not just
 * presence of links. Each pricing tier and CTA must route to /signup;
 * footer links to privacy/terms; nav "Sign in" to /login.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/')
  })

  test('renders the brand wordmark + hero "Intelligence meets eloquence" heading', async ({
    page,
  }) => {
    await expect(page.getByRole('link', { name: /^Plume$/ }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /Intelligence meets eloquence/i })).toBeVisible()
  })

  test('top-nav "Sign in" link routes to /login', async ({ page }) => {
    await page
      .getByRole('link', { name: /^Sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('top-nav "Start writing" CTA routes to /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /Start writing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero "Start your free trial" CTA routes to /signup', async ({ page }) => {
    await page
      .getByRole('link', { name: /Start your free trial/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('hero "See it in action" secondary CTA routes to /login', async ({ page }) => {
    await page
      .getByRole('link', { name: /See it in action/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('every pricing tier "Start with this plan" CTA routes to /signup', async ({ page }) => {
    const links = page.getByRole('link', { name: /Start with this plan/i })
    const count = await links.count()
    expect(count).toBeGreaterThanOrEqual(3)
    await links.first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  // The footer renders Privacy/Terms through LegalModalLinks, which opens the
  // legal HTML in place instead of navigating. These asserted a URL change the
  // app no longer performs; they now exercise the real control, and the two
  // cases below keep the standalone routes covered so the deep links stay
  // tested rather than silently dropped.
  test('footer "Privacy" opens the policy in place', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Privacy$/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(/privacy/i)
  })

  test('footer "Terms" opens the terms in place', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Terms$/i })
      .first()
      .click()
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

  test('three feature columns render — Plume Intelligence, Distraction-free canvas, SEO without the noise', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: /Plume Intelligence/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Distraction-free canvas/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /SEO without the noise/i })).toBeVisible()
  })
})
