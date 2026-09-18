import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Settings page persists unit preferences to localStorage and survives reload', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')

  await page.locator('[data-setting-key="units.temperature"][data-setting-value="Celsius"]').click()
  await page.waitForTimeout(200)

  const before = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(before?.options?.['units.temperature']).toBe('Celsius')

  await page.reload()
  await page.waitForLoadState('domcontentloaded')

  const after = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(after?.options?.['units.temperature']).toBe('Celsius')

  const pressed = await page
    .locator('[data-setting-key="units.temperature"][data-setting-value="Celsius"]')
    .getAttribute('aria-pressed')
  expect(pressed).toBe('true')
})

test('Settings page toggles persist for notifications', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  // Click the "Notifications" nav button to switch sections.
  await page.getByRole('button', { name: /^Notifications$/i }).click()
  // Toggle "Precipitation in the next hour" (defaults to false).
  const target = page.locator('[data-setting-key="notifications.precipNudge"]')
  await target.click()
  await page.waitForTimeout(200)
  const enabled = await target.getAttribute('data-setting-enabled')
  expect(enabled).toBe('true')
  // Survives reload.
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
  await page.getByRole('button', { name: /^Notifications$/i }).click()
  const persisted = await page
    .locator('[data-setting-key="notifications.precipNudge"]')
    .getAttribute('data-setting-enabled')
  expect(persisted).toBe('true')
})

test('Settings page renders the "Tune your dashboard" page heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /tune your dashboard/i })).toBeVisible()
})

test('Section nav buttons flip aria-pressed when clicked', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  const notifBtn = page.getByRole('button', { name: /^Notifications$/i })
  await notifBtn.click()
  await expect(notifBtn).toHaveAttribute('aria-pressed', 'true')
  const apprBtn = page.getByRole('button', { name: /^Appearance$/i })
  await apprBtn.click()
  await expect(apprBtn).toHaveAttribute('aria-pressed', 'true')
  const dataBtn = page.getByRole('button', { name: /^Data sources$/i })
  await dataBtn.click()
  await expect(dataBtn).toHaveAttribute('aria-pressed', 'true')
})

test('Wind unit option (km/h) flips aria-pressed and persists to localStorage', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  const target = page.locator('[data-setting-key="units.wind"][data-setting-value="km/h"]')
  await target.click()
  await expect(target).toHaveAttribute('aria-pressed', 'true')
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(stored?.options?.['units.wind']).toBe('km/h')
})

test('Severe-warning toggle flips state and persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^Notifications$/i }).click()
  const sw = page.locator('[data-setting-key="notifications.severeWarning"]')
  // Default is true — clicking once flips to false.
  await sw.click()
  await expect(sw).toHaveAttribute('data-setting-enabled', 'false')
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(stored?.toggles?.['notifications.severeWarning']).toBe(false)
})

test('Daily digest toggle flips state and persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^Notifications$/i }).click()
  const dd = page.locator('[data-setting-key="notifications.dailyDigest"]')
  await dd.click()
  await expect(dd).toHaveAttribute('data-setting-enabled', 'false')
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(stored?.toggles?.['notifications.dailyDigest']).toBe(false)
})

test('Theme=Light option flips aria-pressed under Appearance and persists', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByRole('button', { name: /^Appearance$/i }).click()
  const themeLight = page.locator(
    '[data-setting-key="appearance.theme"][data-setting-value="Light"]',
  )
  await themeLight.click()
  await expect(themeLight).toHaveAttribute('aria-pressed', 'true')
  const stored = await page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('weather-dashboard.settings.v1') || '{}'),
  )
  expect(stored?.options?.['appearance.theme']).toBe('Light')
})

test('Settings interactions never hit /api endpoints (localStorage-only)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  const reqs = await captureNetwork(page, async () => {
    await page
      .locator('[data-setting-key="units.temperature"][data-setting-value="Celsius"]')
      .click()
    await page.getByRole('button', { name: /^Notifications$/i }).click()
    await page.locator('[data-setting-key="notifications.severeWarning"]').click()
    await page.waitForTimeout(500)
  })
  // Settings is a pure localStorage feature — no /api calls should fire from
  // the change handlers themselves.
  const apiHits = reqs.filter((r) => /\/api\/(units|notifications|appearance|settings)/.test(r.url))
  expect(apiHits).toEqual([])
})
