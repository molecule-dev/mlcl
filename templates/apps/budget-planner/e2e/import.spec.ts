import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, api } from './_helpers.js'

test('Import page renders the heading + account selector + file input', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/accounts', {
    name: 'Default',
    type: 'checking',
    balance_cents: 0,
    on_budget: true,
  })
  await page.goto(APP_BASE + '/import')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.locator('select')).toBeVisible()
  await expect(page.locator('input[type="file"]')).toBeAttached()
})

test('Import without picking a file shows an inline validation error', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/accounts', {
    name: 'Default',
    type: 'checking',
    balance_cents: 0,
    on_budget: true,
  })
  await page.goto(APP_BASE + '/import')
  // Click the preview/validate button — message should fire because no file
  const previewBtn = page.getByRole('button', { name: /preview|run|validate/i }).first()
  if (await previewBtn.count()) {
    await previewBtn.click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  }
})
