/**
 * /settings — three tabs (Account / Reminders / Streaks). Saving any
 * field PUTs /api/profile/me; the change must round-trip through a
 * fresh GET (read-after-write) AND survive a page reload.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test('settings tab navigation switches sections', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /^account$/i })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: /^reminders$/i }).click()
  await expect(page.getByRole('heading', { name: /^reminders$/i })).toBeVisible()

  await page.getByRole('button', { name: /^streaks$/i }).click()
  await expect(page.getByRole('heading', { name: /^streak rules$/i })).toBeVisible()
})

test('updating display name persists via /api/profile/me + reload', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/settings')

  const newName = `Alice ${Date.now()}`
  await page.locator('input[type="text"]').first().fill(newName)

  const reqs = await captureNetwork(page, async () => {
    await page.getByTestId('settings-save').click()
    await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 10_000 })
  })

  const put = reqs.find((r) => r.method === 'PUT' && /\/api\/profile\/me/.test(r.url))
  expect(put?.status).toBe(200)

  // Read-after-write through API.
  const me = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
  expect((await me.json()).name).toBe(newName)

  // Reload — the new name still populates the form.
  await page.reload()
  await expect(page.locator('input[type="text"]').first()).toHaveValue(newName)
})

test('reminder toggle persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^reminders$/i }).click()

  // Flip the daily prompt toggle. NOT .first(): the first checkbox in this
  // section is 'Enable push notifications on this device', which deliberately
  // does not flip when service-worker registration fails (headless) — so the
  // form never became dirty and Save stayed disabled, which surfaced as a
  // timeout on settings-save rather than on the toggle.
  const daily = page.getByRole('checkbox', { name: /daily morning prompt/i }).first()
  const before = await daily.isChecked()
  await daily.click()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 10_000 })

  await page.reload()
  await page.getByRole('button', { name: /^reminders$/i }).click()
  const after = await page
    .getByRole('checkbox', { name: /daily morning prompt/i })
    .first()
    .isChecked()
  expect(after).toBe(!before)
})

test('email field is read-only', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.locator('input[type="email"]').first()).toBeDisabled()
})

test('streaks tab freezesPerWeek persists across reload', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^streaks$/i }).click()
  const freezes = page.locator('input[type="number"]').first()
  await freezes.fill('3')
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved')).toBeVisible({ timeout: 10_000 })

  const me = await page.request.get(`${API_BASE}/profile/me`, { headers: apiHeaders(accessToken) })
  const body = (await me.json()) as { preferences: { freezesPerWeek: number } }
  expect(body.preferences.freezesPerWeek).toBe(3)

  await page.reload()
  await page.getByRole('button', { name: /^streaks$/i }).click()
  await expect(page.locator('input[type="number"]').first()).toHaveValue('3')
})

test('Account tab is the default landing tab', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /^account$/i })).toBeVisible({ timeout: 10_000 })
})

test('save button is disabled when no changes are made', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  // Wait for the settings form to populate.
  await expect(page.getByTestId('settings-save')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByTestId('settings-save')).toBeDisabled()
})
