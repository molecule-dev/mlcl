/**
 * / — public landing page. Asserts hero copy, signup/login CTAs, and
 * the mood-category teaser, plus that no /api calls fire on a public load.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders the hero with the brand promise and primary CTA pair', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /find your still center/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /start free/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('clicking "Start free" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('"Browse by mood" lists at least one category card', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /browse by mood/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /mindfulness/i }).first()).toBeVisible()
  })

  test('public landing does not call any /api endpoint', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const apiCalls = reqs.filter((r) => r.url.includes('/api/'))
    expect(apiCalls, JSON.stringify(apiCalls)).toEqual([])
  })
})
