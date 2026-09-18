import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy — Privacy Notice (public)', () => {
  test('renders heading + the four substantive sections', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { level: 1, name: /privacy notice/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /information we collect/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /how we use it/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /your rights/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^contact$/i })).toBeVisible()
  })

  test('Mentions Solace by name in the intro', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('main')).toContainText(/Solace/)
    await expect(page.locator('main')).toContainText(/protected health information|privacy/i)
  })

  test('Surfaces the privacy contact email', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('main')).toContainText(/privacy@solace\.health/)
  })
})
