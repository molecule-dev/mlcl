/**
 * Root / landing page — public marketing copy renders, primary CTAs link
 * to the right routes, and the page is reachable without auth.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Landing page renders the Hearth marketing hero', async ({ page }) => {
  await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: /Every table, served/i })).toBeVisible()
})

test('Landing exposes "Open your kitchen" CTA → /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
  const cta = page.getByRole('link', { name: /Open your kitchen|Start a free.*kitchen/i }).first()
  await expect(cta).toBeVisible()
  await expect(cta).toHaveAttribute('href', /\/signup/)
})

test('Landing exposes guest-view link → /menu/guest', async ({ page }) => {
  await page.goto(APP_BASE + '/', { waitUntil: 'domcontentloaded' })
  const guest = page.getByRole('link', { name: /guest view|guest menu|see the guest/i }).first()
  await expect(guest).toBeVisible()
  await expect(guest).toHaveAttribute('href', /\/menu\/guest/)
})

test('Public assets load without console errors', async ({ page }) => {
  const errs: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text())
  })
  await page.goto(APP_BASE + '/', { waitUntil: 'networkidle' })
  const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
  expect(fatal, 'console.error during landing').toEqual([])
})
