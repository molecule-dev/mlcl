import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listZones, seedSampleData, signup, uniqueEmail } from './_helpers.js'

test.describe('/locations zone create persists', () => {
  test('seeded zones render in the grid', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/locations')
    await expect(page.getByTestId('locations-page')).toBeVisible()

    const zones = await listZones(page, accessToken)
    expect(zones.length).toBeGreaterThan(0)
    await expect(page.getByTestId('zone-card').first()).toBeVisible()
  })

  test('creating a new zone via UI persists and renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/locations')
    await expect(page.getByTestId('locations-page')).toBeVisible()
    await page.getByTestId('locations-new-toggle').click()
    await expect(page.getByTestId('locations-new-form')).toBeVisible()
    const name = `Smoke-Zone-${Date.now().toString(36)}`
    await page.getByTestId('locations-name').fill(name)
    await page.getByTestId('locations-create-submit').click()
    // After submit, new zone should appear in the grid.
    await page.waitForTimeout(800)
    await expect(page.locator(`text=${name}`).first()).toBeVisible()

    // Reload — zone persists.
    await page.reload()
    await expect(page.locator(`text=${name}`).first()).toBeVisible()
  })
})

// Different signup so suite stays parallel-safe even with --workers=1 (but spec
// owns its own user — no leakage).
test('locations new-zone form requires a name', async ({ page }) => {
  await signup(page, uniqueEmail('loc'))
  await page.goto(APP_BASE + '/locations')
  await page.getByTestId('locations-new-toggle').click()
  await expect(page.getByTestId('locations-new-form')).toBeVisible()
  // Submit without filling name — browser native validation should keep us on the form.
  await page.getByTestId('locations-create-submit').click()
  await page.waitForTimeout(500)
  await expect(page.getByTestId('locations-new-form')).toBeVisible()
})
