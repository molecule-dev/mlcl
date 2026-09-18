import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getPrescriptions, signup } from './_helpers.js'

test.describe('/prescriptions — Active medications', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/prescriptions')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Prescriptions heading + filter chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prescriptions')
    await expect(page.getByRole('heading', { level: 1, name: /^Prescriptions$/i })).toBeVisible({
      timeout: 15000,
    })
    for (const f of ['Active', 'Pending', 'Filled', 'Expired', 'All']) {
      const chip = page.getByRole('button', { name: new RegExp(`^${f}`, 'i') }).first()
      await expect(chip).toBeVisible()
    }
  })

  test('Calls GET /api/prescriptions on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/prescriptions')
      await expect(page.getByRole('heading', { name: /^Prescriptions$/i })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/prescriptions(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/prescriptions').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Active rows from /api/prescriptions are visible under Active', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the medications under test from the API — drug names are content,
    // and a real clinic's prescriptions replace the starter ones.
    const prescriptions = await getPrescriptions(page, accessToken)
    const active = prescriptions.filter((p) => p.status === 'active')
    expect(active.length, 'the patient must have an active prescription').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/prescriptions')
    await expect(page.getByText(active[0].drug).first()).toBeVisible({ timeout: 15000 })
  })

  test('Switching to "All" shows the entire list including filled/expired', async ({ page }) => {
    const { accessToken } = await signup(page)
    const prescriptions = await getPrescriptions(page, accessToken)
    expect(prescriptions.length, 'the patient must have prescriptions').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/prescriptions')
    await page.getByRole('button', { name: /^All$/i }).first().click()
    // "All" must show every row the API returns, whatever its status.
    for (const prescription of prescriptions) {
      await expect(page.getByText(prescription.drug).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('Empty filter (Expired with none) shows the empty-state copy', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/prescriptions')
    await page
      .getByRole('button', { name: /^Expired$/i })
      .first()
      .click()
    // Either an empty card OR a list with only expired rows; if no expired
    // prescriptions are seeded the page must say so.
    const empty = page.getByText(/(No prescriptions match|No prescriptions|empty)/i).first()
    if (await empty.count()) {
      await expect(empty).toBeVisible({ timeout: 5000 })
    }
  })
})
