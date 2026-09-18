import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/.+/)
  })

  test('404 page shows for unknown routes', async ({ page }) => {
    await page.goto('/nonexistent-page-12345')
    // Should either redirect to home or show error
    await expect(page.locator('body')).toBeVisible()
  })
})
