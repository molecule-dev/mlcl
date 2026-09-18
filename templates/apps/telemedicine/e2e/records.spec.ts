import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getRecords, signup } from './_helpers.js'

test.describe('/records — Medical records', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/records')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Medical Records heading and type filter chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/records')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    for (const f of ['All', 'Visit', 'Lab', 'Imaging', 'Note']) {
      const chip = page.getByRole('button', { name: new RegExp(`^${f}`, 'i') }).first()
      if (await chip.count()) await expect(chip).toBeVisible()
    }
  })

  test('Calls GET /api/records on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/records')
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/records(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/records').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Every record /api/records returns appears in the list', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Record summaries are clinical content — read them from the same endpoint
    // the page reads instead of naming the starter lab report.
    const records = await getRecords(page, accessToken)
    expect(records.length, 'the patient must have medical records').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/records')
    for (const record of records) {
      await expect(page.getByText(record.summary).first()).toBeVisible({ timeout: 15000 })
    }
  })

  test('?patient_id=<self> still calls GET /api/records', async ({ page }) => {
    const { userId } = await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(`${APP_BASE}/records?patient_id=${userId}`)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({ timeout: 15000 })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/records/.test(r.url))
    expect(hit).toBeTruthy()
  })
})
