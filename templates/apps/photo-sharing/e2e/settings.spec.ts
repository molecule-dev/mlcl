/**
 * /settings — profile + gallery + privacy + notifications preferences.
 *
 * Per-page spec covering each row in observations/settings.md.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers.js'

test('Settings name input is editable', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
  const newName = `Inline-edit-${Date.now()}`
  await page.getByTestId('settings-name').fill(newName)
  await expect(page.getByTestId('settings-name')).toHaveValue(newName)
})

test('Gallery tab swap reveals gallery toggles', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-tab-gallery').click()
  await expect(page.getByTestId('settings-allow-download')).toBeVisible()
  await expect(page.getByTestId('settings-show-exif')).toBeVisible()
})

test('Allow-download toggle persists round-trip in /api/preferences', async ({ page }) => {
  await signup(page)
  const prefsBefore = await (await page.request.get(`${API_BASE}/preferences`)).json()
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-tab-gallery').click()
  const dl = page.getByTestId('settings-allow-download')
  const wasChecked = await dl.isChecked()
  await dl.click()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })
  const prefsAfter = await (await page.request.get(`${API_BASE}/preferences`)).json()
  const beforeFlag = !!prefsBefore.photoPrefs?.allowDownload
  const afterFlag = !!prefsAfter.photoPrefs?.allowDownload
  expect(afterFlag).toBe(!wasChecked)
  expect(afterFlag).not.toBe(beforeFlag)
})

test('Show-EXIF toggle persists round-trip in /api/preferences', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await page.getByTestId('settings-tab-gallery').click()
  const exif = page.getByTestId('settings-show-exif')
  const before = await exif.isChecked()
  await exif.click()
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })
  const prefsAfter = await (await page.request.get(`${API_BASE}/preferences`)).json()
  const afterFlag = !!prefsAfter.photoPrefs?.showExif
  expect(afterFlag).toBe(!before)
})

test('Save button PATCHes /api/users/:id', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
  const newName = `Save-net-${Date.now()}`
  await page.getByTestId('settings-name').fill(newName)
  const { reqs } = await captureNetwork(page, async () => {
    await page.getByTestId('settings-save').click()
    await page.waitForLoadState('networkidle')
  })
  const patch = reqs.find((r) => /\/api\/users\/[^?]+$/.test(r.url) && r.method === 'PATCH')
  expect(patch, 'PATCH /api/users/:id should fire').toBeTruthy()
  expect(patch!.status).toBeLessThan(300)
})

test('Saved-banner appears, name persists across reload', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByTestId('settings-name')).toBeVisible({ timeout: 15_000 })
  const newName = `Reload-persist-${Date.now()}`
  await page.getByTestId('settings-name').fill(newName)
  await page.getByTestId('settings-save').click()
  await expect(page.getByTestId('settings-saved-banner')).toBeVisible({ timeout: 10_000 })
  await page.reload()
  await expect(page.getByTestId('settings-name')).toHaveValue(newName, { timeout: 10_000 })
})
