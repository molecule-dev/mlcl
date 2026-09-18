import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders Privacy heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Privacy/i, level: 1 })).toBeVisible()
  })

  test('shows intro paragraph (real content, not placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const intro = page.locator('main >> p').first()
    await expect(intro).toBeVisible()
    const text = (await intro.textContent()) || ''
    expect(text.length).toBeGreaterThan(40)
    expect(text.toLowerCase()).not.toContain('placeholder')
    expect(text.toLowerCase()).not.toContain('lorem ipsum')
  })

  test('shows What we store section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /What we store/i })).toBeVisible()
  })

  test('shows Sub-processors section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Sub-processors/i })).toBeVisible()
  })

  test('shows Your rights section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /Your rights/i })).toBeVisible()
  })

  test('shows contact email', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/privacy@/i)).toBeVisible()
  })
})
