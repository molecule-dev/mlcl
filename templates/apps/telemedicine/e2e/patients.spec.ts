import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/patients — Care roster', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/patients')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders Patients heading + care-roster eyebrow + search box', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/patients')
    await expect(page.getByRole('heading', { level: 1, name: /^Patients$/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/care roster/i)).toBeVisible()
    await expect(page.getByPlaceholder(/Search by name|concern/i)).toBeVisible()
  })

  test('Calls GET /api/patients on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/patients')
      await expect(page.getByRole('heading', { name: /^Patients$/i })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/patients(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/patients on load').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Lists at least the signed-in user as a patient row linking to /records', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/patients')
    const row = page
      .getByRole('link')
      .filter({ hasText: /Test User/i })
      .first()
    await expect(row).toBeVisible({ timeout: 15000 })
    const href = await row.getAttribute('href')
    expect(href, 'patient row must link to /records?patient_id=...').toMatch(
      /\/records\?patient_id=/,
    )
  })

  test('Search filters the visible roster', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/patients')
    await expect(
      page
        .getByRole('link')
        .filter({ hasText: /Test User/i })
        .first(),
    ).toBeVisible({ timeout: 15000 })
    await page.getByPlaceholder(/Search by name|concern/i).fill('zzznomatch')
    await expect(page.getByText(/No patients match/i)).toBeVisible({ timeout: 5000 })
  })

  test('Clicking a patient row routes to /records?patient_id=...', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/patients')
    const row = page
      .getByRole('link')
      .filter({ hasText: /Test User/i })
      .first()
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.click()
    await expect(page).toHaveURL(/\/records\?patient_id=/, { timeout: 10000 })
  })
})
