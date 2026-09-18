import { test, expect } from '@playwright/test'

const pages = ['/', '/login', '/signup']

for (const path of pages) {
  test(`screenshot: ${path}`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')

    // Desktop
    await page.setViewportSize({ width: 1440, height: 900 })
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, '-') || 'home'}-desktop.png`, {
      fullPage: true,
      threshold: 0.3,
    })

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, '-') || 'home'}-mobile.png`, {
      fullPage: true,
      threshold: 0.3,
    })
  })
}
