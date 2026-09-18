import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Privacy page (/privacy)', () => {
  test('renders the page title', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /privacy policy/i, level: 1 })).toBeVisible()
  })

  test('"Back to Snagr" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.getByRole('link', { name: /back to snagr/i }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('renders the "What we collect" section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /what we collect/i, level: 2 })).toBeVisible()
  })

  test('renders the "How we use your data" section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(
      page.getByRole('heading', { name: /how we use your data/i, level: 2 }),
    ).toBeVisible()
  })

  test('renders the "Your controls" section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /your controls/i, level: 2 })).toBeVisible()
  })
})
