import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders Your plan has been updated heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /Your plan has been updated/i })).toBeVisible()
  })

  test('renders Thank you heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /Thank you/i })).toBeVisible()
  })

  test('Return home link is present and points at /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const link = page.getByRole('link', { name: /Return home/i })
    await expect(link).toBeVisible()
    expect(await link.getAttribute('href')).toBe('/')
  })

  test('Clicking Return home navigates back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.getByRole('link', { name: /Return home/i }).click()
    await expect(page).toHaveURL(/\/(?:#.*)?$/)
  })
})
