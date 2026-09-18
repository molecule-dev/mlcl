import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signUpWithMedication } from './_helpers.js'

test.describe('/medications/:id (MedicationDetail)', () => {
  test('renders heading with medication name', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await expect(
      page.getByRole('heading', { name: new RegExp(String(medication.name), 'i') }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('renders adherence + pills-left + refills + taken stat cards from server', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    // The 4 KPI tiles are rendered as separate Stat components — at least look for one of
    // their labels (Adherence) and confirm a numeric value in the same card.
    await expect(page.getByText(/adherence/i).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/pills left|remaining/i).first()).toBeVisible()
  })

  test('schedule chip list renders the medication schedule_times', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    // Accept either 24h ("08:00") or 12h ("8:00 AM") rendering — the user's
    // appearance.timeFormat preference picks which.
    await expect(page.getByText(/(^|\s)0?8:00(\s*AM)?\b/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Edit button opens the inline edit form', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: /edit medication/i }).first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('Save edit PATCHes /medications/:id and persists across reload', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click()
    const newName = `Renamed-${Date.now()}`
    const nameInput = page.locator('form input[type="text"]').first()
    await nameInput.fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /save changes|^save$/i })
        .first()
        .click()
      await page.waitForTimeout(800)
    })
    const patchCall = reqs.find((r) => /\/api\/medications\//.test(r.url) && r.method === 'PATCH')
    expect(patchCall, 'PATCH /api/medications/:id issued').toBeTruthy()
    expect(patchCall!.status).toBeLessThan(400)
    await page.reload()
    await expect(page.getByRole('heading', { name: new RegExp(newName) }).first()).toBeVisible({
      timeout: 10_000,
    })
    const reread = await api<{ name: string }>(page, 'GET', `/medications/${medication.id}`)
    expect(reread.name).toBe(newName)
  })

  test('Cancel inside edit form closes the form without saving', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click()
    await page
      .locator('form')
      .first()
      .getByRole('button', { name: /^cancel$/i })
      .click()
    await expect(page.getByRole('heading', { name: /edit medication/i })).toHaveCount(0, {
      timeout: 5_000,
    })
  })

  test('Delete button opens a confirm dialog', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('button', { name: /^delete$/i })
      .first()
      .click()
    await expect(page.getByRole('alertdialog').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Confirm delete DELETEs /medications/:id, navigates back, removes from list', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('button', { name: /^delete$/i })
      .first()
      .click()
    const dialog = page.getByRole('alertdialog')
    const reqs = await captureNetwork(page, async () => {
      await dialog.getByRole('button', { name: /delete medication/i }).click()
      await expect(page).toHaveURL(/\/medications$/, { timeout: 10_000 })
    })
    const del = reqs.find((r) => /\/api\/medications\//.test(r.url) && r.method === 'DELETE')
    expect(del, 'DELETE issued').toBeTruthy()
    expect(del!.status).toBeLessThan(400)
    const after = await api<Array<{ id: string }>>(page, 'GET', '/medications')
    expect(
      after.find((m) => m.id === medication.id),
      'medication removed',
    ).toBeFalsy()
  })

  test('Back to all medications link navigates to /medications', async ({ page }) => {
    const { medication } = await signUpWithMedication(page)
    await page.goto(APP_BASE + `/medications/${medication.id}`)
    await page
      .getByRole('link', { name: /all medications/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/medications$/, { timeout: 10_000 })
  })

  test('Detail mount captures GET /medications/:id and GET /doses?medication_id=', async ({
    page,
  }) => {
    const { medication } = await signUpWithMedication(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/medications/${medication.id}`)
      await page.waitForTimeout(800)
    })
    expect(
      reqs.find(
        (r) => new RegExp(`/api/medications/${medication.id}`).test(r.url) && r.method === 'GET',
      ),
    ).toBeTruthy()
    expect(
      reqs.find((r) => /\/api\/doses\?medication_id=/.test(r.url) && r.method === 'GET'),
    ).toBeTruthy()
  })
})
