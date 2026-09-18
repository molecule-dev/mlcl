/**
 * / and /pricing — public pages render.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('public landing pages', () => {
  test('/ renders with a signup or sign-in CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.getByRole('link', { name: /sign\s*in|log\s*in|sign\s*up|get started/i }).first(),
    ).toBeVisible()
  })

  test('/pricing renders pricing tiers', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/privacy renders content', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/terms renders content', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
