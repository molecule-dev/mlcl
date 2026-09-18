import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms: public terms of service', () => {
  test('renders the page heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms of service/i }).first()).toBeVisible()
  })

  test('mentions the four expected section headings', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /your account/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /acceptable use/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible()
  })

  test('"Back to home" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    const back = page.getByRole('link', { name: /back to home/i }).first()
    await back.click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/\W/g, '\\$&')}/?$`))
  })
})
