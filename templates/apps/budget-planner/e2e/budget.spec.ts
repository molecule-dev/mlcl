import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Budget renders KPIs (Total assigned, Total spent, Overspent, Available)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/budget')
  await expect(page.getByText(/total assigned/i)).toBeVisible()
  await expect(page.getByText(/total spent/i)).toBeVisible()
  await expect(page.getByText(/overspent/i)).toBeVisible()
  await expect(page.getByText(/available/i).first()).toBeVisible()
})

test('Empty budget tells the user to add categories', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/budget')
  await expect(page.getByText(/no categories yet/i)).toBeVisible()
})

test('Category groups appear once user has categories', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/categories', { name: 'Groceries', group_name: 'Essentials' })
  await api(page, 'POST', '/categories', { name: 'Coffee', group_name: 'Discretionary' })
  await page.goto(APP_BASE + '/budget')
  await expect(page.getByText(/essentials/i).first()).toBeVisible()
  await expect(page.getByText(/discretionary/i).first()).toBeVisible()
})

test('Month nav buttons (prev / next) change the displayed month label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/budget')
  // Month label is rendered like "May 2026" — read the current value, click
  // prev, expect a different label.
  const monthBefore = await page.locator('span.tabular-nums').first().textContent()
  await page.getByRole('button', { name: /previous month/i }).click()
  await expect(page.locator('span.tabular-nums').first()).not.toHaveText(monthBefore || '___', {
    timeout: 5000,
  })
})
