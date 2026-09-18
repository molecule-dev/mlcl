import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, listReturns, seedSampleData, signup } from './_helpers.js'

test.describe('/returns triage create + status change', () => {
  test('seeded returns render with RMA numbers', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/returns')
    await expect(page.getByTestId('returns-page')).toBeVisible()
    const rows = await listReturns(page, accessToken)
    expect(rows.length).toBeGreaterThan(0)
    if (rows[0].rma_number) {
      await expect(page.locator(`text=${rows[0].rma_number}`).first()).toBeVisible()
    }
  })

  test('issuing a new RMA persists', async ({ page }) => {
    const { accessToken } = await signup(page)
    await page.goto(APP_BASE + '/returns')
    await page.getByTestId('returns-new-toggle').click()
    await expect(page.getByTestId('returns-new-form')).toBeVisible()
    const reason = `e2e reason ${Date.now().toString(36)}`
    await page.getByTestId('returns-reason').fill(reason)
    await page.getByTestId('returns-create-submit').click()
    await page.waitForTimeout(800)

    const list = await listReturns(page, accessToken)
    const found = list.find((r) => r.reason === reason)
    expect(found, 'return persisted with our reason').toBeTruthy()
    await expect(page.locator(`text=${reason}`).first()).toBeVisible()
  })

  test('changing return status via select persists', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/returns')
    const select = page.getByTestId('return-status-select').first()
    await expect(select).toBeVisible({ timeout: 10000 })
    await select.selectOption('received')
    await page.waitForTimeout(800)

    const list = await listReturns(page, accessToken)
    expect(list.some((r) => r.status === 'received')).toBe(true)
  })
})
