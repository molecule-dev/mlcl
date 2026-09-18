/**
 * Pricing — public marketing page that renders Morsel's tier table and
 * primary CTA. We assert on the rendered layout (the public-route
 * contract) rather than a specific dollar number, since pricing copy is
 * editorial.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('/pricing renders without auth', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page).toHaveURL(/\/pricing/)
  // At minimum, the page should render *something* — a heading.
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 8000 })
})

test('/pricing has at least one CTA link or button', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  const hasCta =
    (await page.getByRole('link').count()) > 0 || (await page.getByRole('button').count()) > 0
  expect(hasCta).toBe(true)
})

test('/pricing exposes a path back to signup or app', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  // A pricing page that doesn't expose a way to start a trial / sign in is
  // a dead-end; one of these must exist.
  const links = await page.getByRole('link').allTextContents()
  const txt = links.join(' ').toLowerCase()
  expect(txt).toMatch(/(sign|join|start|trial|get|free|discover|home|morsel)/)
})
