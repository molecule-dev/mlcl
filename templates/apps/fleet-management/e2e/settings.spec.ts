import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, waitForSeed } from './_helpers.js'

async function gotoSettings(page: import('@playwright/test').Page) {
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
    timeout: 15000,
  })
}

test.describe('settings', () => {
  test('page loads and GET /api/users/me returns 200', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    const reqs = await captureNetwork(page, async () => {
      await gotoSettings(page)
    })
    const req = reqs.find((r) => /\/api\/users\/me/.test(r.url) && r.method === 'GET')
    expect(req?.status, 'GET /api/users/me').toBe(200)
  })

  test('eyebrow "Operations & dispatch" is visible above the heading', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await expect(page.getByText(/^operations & dispatch$/i)).toBeVisible()
  })

  test('section nav landmark exposes three buttons', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const nav = page.getByRole('navigation', { name: /settings sections/i })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('button', { name: /^organization$/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /^thresholds$/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /^notifications$/i })).toBeVisible()
  })

  test('Organization section is the default active tab (aria-current=page)', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await expect(page.getByRole('button', { name: /^organization$/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('Thresholds tab switches to alert-thresholds section', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    await expect(page.getByRole('heading', { name: /alert thresholds/i })).toBeVisible()
  })

  test('Notifications tab switches to notifications section', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    await expect(page.getByRole('heading', { name: /^notifications$/i, level: 2 })).toBeVisible()
  })

  test('Organization name field is editable', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const field = page.getByLabel(/organization name/i)
    await field.fill('Acme Logistics')
    await expect(field).toHaveValue('Acme Logistics')
  })

  test('Timezone field is editable', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const field = page.getByLabel(/^timezone$/i)
    await field.fill('America/Los_Angeles')
    await expect(field).toHaveValue('America/Los_Angeles')
  })

  test('Dispatch hours field is editable', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const field = page.getByLabel(/dispatch hours/i)
    await field.fill('5:00am – 11:00pm')
    await expect(field).toHaveValue('5:00am – 11:00pm')
  })

  test('Speeding threshold numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const field = page.getByLabel(/speeding threshold/i)
    await field.fill('12')
    await expect(field).toHaveValue('12')
  })

  test('Idle threshold numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const field = page.getByLabel(/idle threshold/i)
    await field.fill('20')
    await expect(field).toHaveValue('20')
  })

  test('Low-fuel threshold numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const field = page.getByLabel(/low fuel threshold/i)
    await field.fill('10')
    await expect(field).toHaveValue('10')
  })

  test('Detect hard braking checkbox toggles', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const cb = page.getByLabel(/detect hard braking/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Detect hard acceleration checkbox toggles', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const cb = page.getByLabel(/detect hard acceleration/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Speeding alerts notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/speeding alerts/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Maintenance reminders notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/maintenance reminders/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Geofence breaches notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/geofence breaches/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Weekly performance digest notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/weekly performance digest/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Save changes PATCHes /api/users/:id and persists threshold across reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    const speedField = page.getByLabel(/speeding threshold/i)
    await speedField.fill('17')
    const saveReqPromise = page.waitForResponse(
      (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /save changes/i }).click()
    const saveResp = await saveReqPromise
    expect(saveResp.status(), 'PATCH /api/users/:id').toBe(200)
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible({ timeout: 5000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole('button', { name: /^thresholds$/i }).click()
    await expect(page.getByLabel(/speeding threshold/i)).toHaveValue('17')
  })

  test('Save changes persists organization name across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoSettings(page)
    const orgField = page.getByLabel(/organization name/i)
    const newName = `Persisted Co ${Date.now() % 100000}`
    await orgField.fill(newName)
    const saveReqPromise = page.waitForResponse(
      (r) => /\/api\/users\//.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /save changes/i }).click()
    const saveResp = await saveReqPromise
    expect(saveResp.status(), 'PATCH /api/users/:id').toBe(200)
    await page.reload()
    await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByLabel(/organization name/i)).toHaveValue(newName)
  })
})
