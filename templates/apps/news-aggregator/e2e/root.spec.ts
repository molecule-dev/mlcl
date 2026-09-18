/**
 * Per-page coverage for / (Landing). Cross-references e2e/observations/root.md.
 * Lightweight smoke around the marketing page that is the agent's first
 * impression — broken links/headings here mean the user can't even reach
 * /signup.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('renders the hero headline visibly', async ({ page }) => {
    // Wrap in captureNetwork to assert the marketing render is fully static
    // (no /api/* GETs slip in via misconfigured bonds — observation table
    // documents zero expected backend calls during normal use).
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading', { name: /every angle, one view/i })).toBeVisible()
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls.length).toBe(0)
  })

  test('"Start reading free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start reading free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" top-nav link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
