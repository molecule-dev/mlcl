import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getMyUserId, signup } from './_helpers.js'

test.describe('/settings (Settings)', () => {
  test('Settings page renders heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.getByRole('heading', { name: /^settings$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Notifications / Pharmacy / Appearance tabs switch panes', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^pharmacy$/i }).click()
    await expect(page.getByRole('heading', { name: /default pharmacy/i }).first()).toBeVisible({
      timeout: 5_000,
    })
    await page.getByRole('button', { name: /^appearance$/i }).click()
    await expect(page.getByRole('heading', { name: /^appearance$/i }).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('Dose-time push toggle persists after reload (PATCH /users/:id)', async ({ page }) => {
    await signup(page)
    const userId = await getMyUserId(page)
    await page.goto(APP_BASE + '/settings')
    const toggle = page.getByLabel(/dose-time push notification/i).first()
    await expect(toggle).toBeChecked()
    const reqs = await captureNetwork(page, async () => {
      await toggle.uncheck()
      await page.waitForTimeout(1200)
    })
    const patch = reqs.find(
      (r) => new RegExp(`/api/users/${userId}$`).test(r.url) && r.method === 'PATCH',
    )
    expect(patch, 'PATCH /api/users/:id issued on toggle').toBeTruthy()
    expect(patch!.status).toBeLessThan(400)
    await page.reload()
    await expect(page.getByLabel(/dose-time push notification/i).first()).not.toBeChecked({
      timeout: 15_000,
    })
  })

  test('Time format select persists 24h selection across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^appearance$/i }).click()
    const select = page.getByLabel(/time format/i)
    await select.selectOption('24h')
    await page.waitForTimeout(1500)
    await page.reload()
    await page.getByRole('button', { name: /^appearance$/i }).click()
    await expect(page.getByLabel(/time format/i)).toHaveValue('24h', { timeout: 15_000 })
  })

  test('Default pharmacy save PATCH persists pharmacy.name across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /^pharmacy$/i }).click()
    const nameInput = page.getByLabel(/pharmacy name/i).first()
    await nameInput.fill('Acme Pharmacy')
    await page
      .getByRole('button', { name: /save pharmacy/i })
      .first()
      .click()
    await page.waitForTimeout(1200)
    await page.reload()
    await page.getByRole('button', { name: /^pharmacy$/i }).click()
    await expect(page.getByLabel(/pharmacy name/i).first()).toHaveValue('Acme Pharmacy', {
      timeout: 15_000,
    })
  })
})
