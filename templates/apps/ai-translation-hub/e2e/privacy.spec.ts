import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy: public privacy policy', () => {
  test('renders the page heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
  })

  test('mentions the three section headings (collect / subprocessors / deleting)', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /what we collect/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /subprocessors/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /deleting your data/i })).toBeVisible()
  })

  test('"Back to home" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const back = page.getByRole('link', { name: /back to home/i }).first()
    await back.click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/\W/g, '\\$&')}/?$`))
  })
})
