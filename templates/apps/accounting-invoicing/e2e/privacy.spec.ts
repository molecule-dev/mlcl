/**
 * /privacy — static legal page.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('privacy page', () => {
  test('renders heading and is publicly accessible', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    await expect(page).toHaveURL(/\/privacy/)
  })

  test('contains "privacy" or "policy" text in body', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const text = await page.locator('body').textContent()
    expect(text?.toLowerCase()).toMatch(/privacy|policy|data|information/)
  })

  test('renders without console errors', async ({ page }) => {
    const errs: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errs.push(m.text())
    })
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('h1, h2').first()).toBeVisible()
    const fatal = errs.filter((e) => !/favicon|net::ERR_|Failed to load resource/.test(e))
    expect(fatal).toEqual([])
  })
})
