import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, seedSampleData, signup } from './_helpers.js'

test.describe('/reports KPI snapshot', () => {
  test('reports page renders KPI cards + lifecycle buckets after seed', async ({ page }) => {
    const { accessToken } = await signup(page)
    await seedSampleData(page, accessToken)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByTestId('reports-page')).toBeVisible()
    await expect(page.getByTestId('reports-buckets')).toBeVisible()
    const buckets = page.getByTestId('report-bucket')
    await expect(buckets.first()).toBeAttached()
    // At least one bucket should have a non-zero numeric value once seeded.
    const values = await page.getByTestId('report-bucket-value').allTextContents()
    expect(values.some((v) => Number(v) > 0)).toBe(true)
  })
})
