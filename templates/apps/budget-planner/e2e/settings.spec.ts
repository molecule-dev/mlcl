import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, api } from './_helpers.js'

test('Settings page shows the four section tabs', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  for (const label of ['Profile', 'Preferences', 'Billing', 'Data']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') })).toBeVisible()
  }
})

test('Save profile PATCHes /api/profile/me and shows success status', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  // section "profile" is default; locate the first text input and update
  await page.locator('input[type="text"]').first().fill('Settings User')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save profile/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 })
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
  expect(patch?.status).toBeLessThan(300)
})

test('Save preferences PATCHes /api/profile/me with prefs and shows status', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^preferences$/i }).click()
  await page.locator('select').selectOption('Monday')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /save preferences/i }).click()
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10000 })
  })
  const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
  expect(patch?.status).toBeLessThan(300)
  // Backend invariant — preference saved.
  const me = await api<Record<string, any>>(page, 'GET', '/profile/me')
  expect(me.preferences?.firstDayOfWeek).toBe('Monday')
})

test('Billing tab shows plan info and Change plan button', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^billing$/i }).click()
  // Free user: plan-line is "You are on the Free plan." — assert the visible
  // copy precisely instead of /plan/i, which collides with the "Change plan"
  // button label.
  await expect(page.getByText(/you are on the .* plan/i)).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('button', { name: /change plan/i })).toBeVisible()
})

test('Data export tab exposes CSV and JSON download buttons', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^data$/i }).click()
  await expect(page.getByRole('button', { name: /export csv/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /export json/i })).toBeVisible()
})

test('Export CSV triggers a /api/export/transactions.csv request', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^data$/i }).click()
  const reqs: { method: string; url: string; status: number }[] = []
  page.on('response', (r) => {
    reqs.push({ method: r.request().method(), url: r.url(), status: r.status() })
  })
  await page.getByRole('button', { name: /export csv/i }).click()
  await page.waitForTimeout(1500)
  const exp = reqs.find((r) => /\/api\/export\/transactions\.csv/.test(r.url))
  expect(
    exp?.status,
    `Expected /api/export/transactions.csv to return < 400, got ${exp?.status}`,
  ).toBeLessThan(400)
})
