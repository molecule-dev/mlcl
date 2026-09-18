import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms', () => {
  test('renders Terms heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Terms/i, level: 1 })).toBeVisible()
  })

  test('shows intro paragraph (real content, not placeholder)', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const intro = page.locator('main >> p').first()
    await expect(intro).toBeVisible()
    const text = (await intro.textContent()) || ''
    expect(text.length).toBeGreaterThan(40)
    expect(text.toLowerCase()).not.toContain('placeholder')
    expect(text.toLowerCase()).not.toContain('lorem ipsum')
  })

  test('shows Acceptable use section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Acceptable use/i })).toBeVisible()
  })

  test('shows Service level section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Service level/i })).toBeVisible()
  })

  test('shows Termination section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /Termination/i })).toBeVisible()
  })

  test('shows contact email', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/legal@/i)).toBeVisible()
  })
})
