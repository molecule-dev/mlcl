/**
 * /templates — gallery of starting points for new decks.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('templates: gallery renders with at least one template card', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/templates')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('template-grid')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('template-card-pitch-aurora')).toBeVisible()
})

test('templates: clicking a template card navigates to /decks?template=…', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/templates')
  await page.waitForLoadState('networkidle')
  await page.getByTestId('template-card-pitch-aurora').click()
  await page.waitForURL(/\/decks(\?template=|\/[0-9a-f-]+\/edit)/, { timeout: 15_000 })
})

test('templates: sidebar nav still has "Templates" link visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/templates')
  await expect(
    page
      .getByRole('navigation')
      .getByRole('link', { name: /^Templates$/ })
      .first(),
  ).toBeVisible()
})
