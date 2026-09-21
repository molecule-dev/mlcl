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

  test('eyebrow "Company & scheduling" is visible above the heading', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await expect(page.getByText(/^company & scheduling$/i)).toBeVisible()
  })

  test('section nav landmark exposes three buttons', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const nav = page.getByRole('navigation', { name: /settings sections/i })
    await expect(nav).toBeVisible()
    await expect(nav.getByRole('button', { name: /^organization$/i })).toBeVisible()
    await expect(nav.getByRole('button', { name: /^scheduling$/i })).toBeVisible()
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

  test('Scheduling tab switches to scheduling-defaults section', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    await expect(page.getByRole('heading', { name: /scheduling defaults/i })).toBeVisible()
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
    await field.fill('Acme Services')
    await expect(field).toHaveValue('Acme Services')
  })

  test('Timezone field is editable', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const field = page.getByLabel(/^timezone$/i)
    await field.fill('America/Los_Angeles')
    await expect(field).toHaveValue('America/Los_Angeles')
  })

  test('Office hours field is editable', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    const field = page.getByLabel(/office hours/i)
    await field.fill('5:00am – 11:00pm')
    await expect(field).toHaveValue('5:00am – 11:00pm')
  })

  test('Quote validity numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const field = page.getByLabel(/quote validity/i)
    await field.fill('21')
    await expect(field).toHaveValue('21')
  })

  test('Job reminder lead time numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const field = page.getByLabel(/job reminder lead time/i)
    await field.fill('48')
    await expect(field).toHaveValue('48')
  })

  test('Invoice due numeric input accepts a number', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const field = page.getByLabel(/invoice due/i)
    await field.fill('30')
    await expect(field).toHaveValue('30')
  })

  test('Morning schedule emails checkbox toggles', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const cb = page.getByLabel(/morning schedule/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Checklist warning checkbox toggles', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const cb = page.getByLabel(/open checklist items/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Unassigned job alerts notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/unassigned job alerts/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Quote activity notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/quote accepted or declined/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Job completions notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/^job completions$/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Weekly revenue digest notification toggle flips', async ({ page }) => {
    await signup(page)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^notifications$/i }).click()
    const cb = page.getByLabel(/weekly revenue digest/i)
    const before = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !before })
  })

  test('Save changes PATCHes /api/settings and persists a setting across reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoSettings(page)
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    const field = page.getByLabel(/quote validity/i)
    await field.fill('21')
    const saveReqPromise = page.waitForResponse(
      (r) => /\/api\/settings(\?|$)/.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /save changes/i }).click()
    const saveResp = await saveReqPromise
    expect(saveResp.status(), 'PATCH /api/settings').toBe(200)
    await expect(page.getByText(/^saved\.?$/i)).toBeVisible({ timeout: 5000 })

    await page.reload()
    await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await page.getByRole('button', { name: /^scheduling$/i }).click()
    await expect(page.getByLabel(/quote validity/i)).toHaveValue('21')
  })

  test('Save changes persists organization name across reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    await waitForSeed(page, accessToken)
    await gotoSettings(page)
    const orgField = page.getByLabel(/organization name/i)
    const newName = `Persisted Co ${Date.now() % 100000}`
    await orgField.fill(newName)
    const saveReqPromise = page.waitForResponse(
      (r) => /\/api\/settings(\?|$)/.test(r.url()) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: /save changes/i }).click()
    const saveResp = await saveReqPromise
    expect(saveResp.status(), 'PATCH /api/settings').toBe(200)
    await page.reload()
    await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByLabel(/organization name/i)).toHaveValue(newName)
  })
})
