import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/about', () => {
  test('renders the about page', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('mentions Dendrite', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toContain('dendrite')
  })

  test('has a back/footer link', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await expect(page.getByRole('link').first()).toBeVisible()
  })
})
