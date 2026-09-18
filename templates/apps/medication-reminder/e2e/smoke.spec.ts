import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup, api } from './_helpers.js'

test('SMOKE: signup, navigate to dashboard, list medications (read-after-write contract)', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })

  // Read-after-write: a fresh user starts with zero medications.
  const meds = await api<unknown[]>(page, 'GET', '/medications')
  expect(Array.isArray(meds), 'GET /medications returns an array').toBe(true)
  expect(meds.length, 'fresh user has no medications').toBe(0)
})
