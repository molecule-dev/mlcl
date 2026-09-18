import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test.describe('/medications/new (AddMedication)', () => {
  test('Medication name input accepts a typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const input = page.locator('input[type="text"]').first()
    await input.fill('Atorvastatin')
    await expect(input).toHaveValue('Atorvastatin')
  })

  test('Dose amount input accepts a typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const inputs = page.locator('input[type="text"]')
    await inputs.nth(1).fill('20 mg')
    await expect(inputs.nth(1)).toHaveValue('20 mg')
  })

  test('Pill color radio buttons toggle aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const greenButton = page.getByRole('button', { name: /^green$/ }).first()
    await greenButton.click()
    await expect(greenButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('Schedule input accepts a typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const schedInput = page.locator('input[type="text"]').nth(2)
    await schedInput.fill('Twice daily')
    await expect(schedInput).toHaveValue('Twice daily')
  })

  test('Pharmacy input accepts a typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const pharmacyInput = page.locator('input[type="text"]').nth(3)
    await pharmacyInput.fill('Walgreens 4th Ave')
    await expect(pharmacyInput).toHaveValue('Walgreens 4th Ave')
  })

  test('Take with food checkbox toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')
    const cb = page.locator('input[type="checkbox"]').first()
    await cb.check()
    await expect(cb).toBeChecked()
  })

  test('Save POSTs /api/medications and navigates to /medications, with the new med visible', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications/new')

    const name = `Spec-${Date.now()}`
    const inputs = page.locator('input[type="text"]')
    await inputs.nth(0).fill(name)
    await inputs.nth(1).fill('5 mg')
    await inputs.nth(2).fill('Daily, 9am')

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save medication|^save$/i })
        .first()
        .click()
      await expect(page).toHaveURL(/\/medications$/, { timeout: 15_000 })
    })
    const created = reqs.find((r) => /\/api\/medications$/.test(r.url) && r.method === 'POST')
    expect(created, 'POST /api/medications must be issued').toBeTruthy()
    expect(created!.status).toBeLessThan(400)

    const list = await api<Array<{ name: string }>>(page, 'GET', '/medications')
    expect(
      list.find((m) => m.name === name),
      'new medication appears in /medications',
    ).toBeTruthy()
  })

  test('Cancel link navigates to /medications without creating a record', async ({ page }) => {
    await signup(page)
    const before = await api<unknown[]>(page, 'GET', '/medications')
    await page.goto(APP_BASE + '/medications/new')
    await page
      .getByRole('link', { name: /^cancel$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/medications$/, { timeout: 10_000 })
    const after = await api<unknown[]>(page, 'GET', '/medications')
    expect(after.length, 'cancel must not create a medication').toBe(before.length)
  })
})
