import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication, signup } from './_helpers.js'

test.describe('/medications (Medications)', () => {
  test('Medications page renders heading + medications count subtitle', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications')
    await expect(page).toHaveURL(/\/medications/)
    await expect(page.getByRole('heading', { name: /medications/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('+ Add medication link navigates to /medications/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/medications')
    await page
      .getByRole('link', { name: /add medication/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/medications\/new/, { timeout: 10_000 })
  })

  test('Medication card row navigates to /medications/:id when clicked', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + '/medications')
    await page
      .getByRole('link')
      .filter({ hasText: new RegExp(String(medication.name).split(' ')[0]!, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`/medications/${medication.id}`), { timeout: 10_000 })
  })

  test('empty state placeholder shows for fresh user with zero medications', async ({ page }) => {
    await signup(page)
    const meds = await api<unknown[]>(page, 'GET', '/medications')
    expect(meds.length, 'fresh user has zero medications').toBe(0)

    await page.goto(APP_BASE + '/medications')
    await expect(page.getByText(/no medications yet|add one to start/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Medications page mount captures /api/medications', async ({ page }) => {
    await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/medications')
      await page.waitForTimeout(1000)
    })
    expect(reqs.find((r) => /\/api\/medications/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })
})
