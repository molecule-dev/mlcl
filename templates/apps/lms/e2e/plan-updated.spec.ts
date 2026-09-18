import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the confirmation heading after a fresh signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /your plan has been updated/i })).toBeVisible()
  })

  test('shows the thank-you secondary heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible()
  })

  test('return-home action navigates to / (or /dashboard)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const action = page.getByRole('button', { name: /return home/i })
    await expect(action).toBeVisible()
    await action.click()
    await expect(page).toHaveURL(/\/(dashboard)?$/)
  })
})
