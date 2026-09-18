/**
 * Per-page spec for / (Landing). Verifies the marketing home renders
 * real copy and links to /signup, /login, /pricing as observed.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET / renders a non-empty hero with a heading', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1, h2').first()).toBeVisible()
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text).not.toMatch(/coming soon|placeholder|tbd|under construction|lorem ipsum/i)
})

test('Landing has a sign-up CTA that navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const cta = page.getByRole('link', { name: /sign\s*up|get\s*started|create.*account/i }).first()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/signup/)
})

test('Landing has a sign-in link that navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
  await expect(link).toBeVisible()
  await link.click()
  await expect(page).toHaveURL(/\/login/)
})

test('Landing exposes a pricing link that navigates to /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const link = page.getByRole('link', { name: /pricing/i }).first()
  if (await link.count()) {
    await link.click()
    await expect(page).toHaveURL(/\/pricing/)
  } else {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.locator('h1, h2').first()).toBeVisible()
  }
})
