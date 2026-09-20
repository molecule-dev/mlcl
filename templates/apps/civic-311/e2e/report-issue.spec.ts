import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedIssue, signup, TINY_PNG } from './_helpers.js'

test.describe('civic-311: /report (ReportIssue)', () => {
  test('renders the report form with categories, description, photo and map', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/report')
    await expect(page.getByTestId('report-issue-title')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('report-category-pothole')).toBeVisible()
    await expect(page.getByTestId('report-category-streetlight')).toBeVisible()
    await expect(page.getByTestId('report-description')).toBeVisible()
    await expect(page.getByTestId('report-photo')).toBeVisible()
    await expect(page.getByTestId('report-map')).toBeVisible()
  })

  test('blank form keeps submit disabled (no clickthrough)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/report')
    const submit = page.getByTestId('report-submit')
    await expect(submit).toBeDisabled()
    await expect(page).toHaveURL(/\/report/)
  })

  test('picking a category + pin derives the address preview', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/report')
    await page.getByTestId('report-category-pothole').click()
    // Click near the upper-left region of the map → west side address.
    const map = page.getByTestId('report-map')
    const box = (await map.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.34, box.y + box.height * 0.27)
    await expect(page.getByTestId('report-address-value')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByTestId('report-address-value')).toContainText(
      /Ave & [WE] \d+(st|nd|rd|th) St/,
    )
  })

  test('photo upload attaches and submit posts to /api/issues', async ({ page }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/report')
    await page.getByTestId('report-category-pothole').click()
    await page
      .getByTestId('report-description')
      .fill('E2E pothole near the corner — deep and wide.')
    await page.getByTestId('report-photo').setInputFiles({
      name: 'e2e-pothole.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.getByTestId('report-photo-attached')).toBeVisible({ timeout: 15_000 })
    const map = page.getByTestId('report-map')
    const box = (await map.boundingBox())!
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.6)
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('report-submit').click()
      await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })
    })
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/issues'))).toBe(true)
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/issues/photo'))).toBe(true)
    // The created row carries the derived address, not a client-supplied one.
    const detail = await page.request.get(`/api/issues/${page.url().split('/').pop()}`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
    expect(detail.ok()).toBe(true)
    const body = (await detail.json()) as { derived_address: string; photo_url: string | null }
    expect(body.derived_address).toMatch(/Ave & [WE] \d+(st|nd|rd|th) St/)
    expect(body.photo_url).toContain('/api/issues/photo/')
  })

  test('nearby open report of the same kind surfaces as a duplicate before submit', async ({
    page,
  }) => {
    const session = await signup(page)
    // An open pothole report exists at (34, 27).
    await seedIssue(page, session.accessToken, {
      category: 'pothole',
      description: 'Existing bike-lane pothole',
      x: 34,
      y: 27,
    })
    await page.goto(APP_BASE + '/report')
    await page.getByTestId('report-category-pothole').click()
    const map = page.getByTestId('report-map')
    const box = (await map.boundingBox())!
    // Pin close enough (≈2 blocks) to trip the 5-block duplicate radius.
    await page.mouse.click(box.x + box.width * 0.36, box.y + box.height * 0.29)
    await expect(page.getByTestId('report-duplicates')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByTestId('report-duplicate-item').first()).toBeVisible()
    // Submit stays locked until the reporter acknowledges the notice…
    const submit = page.getByTestId('report-submit')
    await page.getByTestId('report-description').fill('A different pothole, further along.')
    await expect(submit).toBeDisabled()
    // …then goes through ("submit anyway").
    await page.getByTestId('report-duplicates-acknowledge').check()
    await expect(submit).toBeEnabled()
    const reqs = await captureNetwork(page, async () => {
      await submit.click()
      await expect(page).toHaveURL(/\/reports\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })
    })
    expect(reqs.some((r) => r.method === 'GET' && r.url.includes('/api/issues/duplicates'))).toBe(
      true,
    )
    expect(reqs.some((r) => r.method === 'POST' && r.url.includes('/api/issues'))).toBe(true)
  })
})
