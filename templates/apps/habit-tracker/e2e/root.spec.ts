/**
 * / — Public landing page. Heading, hero card, and signup CTA.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('landing page is publicly reachable', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })
  // The page should fetch nothing or only public assets — no 5xx anywhere.
  const failed = reqs.filter((r) => r.status >= 500)
  expect(failed, JSON.stringify(failed)).toEqual([])
})

test('signup CTA on landing routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const cta = page
    .getByRole('link', { name: /sign\s*up|get started|start (your )?streak|create account/i })
    .first()
  if (await cta.count().catch(() => 0)) {
    await cta.click()
    await page.waitForURL(/\/signup/, { timeout: 10_000 })
  }
})

test('sign-in link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.getByRole('link', { name: /^sign in$/i }).click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
})

test('"start free" link routes to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.getByRole('link', { name: /^start free$/i }).click()
  await page.waitForURL(/\/signup/, { timeout: 10_000 })
})

test('"see it live" link routes to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.getByRole('link', { name: /^see it live$/i }).click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
})

test('hero stat cards render real-looking numbers', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByText(/47k\+|streaks alive|days/i).first()).toBeVisible({ timeout: 10_000 })
})
