import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, API_BASE, seedMap, signup, uniqueEmail } from './_helpers.js'

test.describe('Maps list', () => {
  test('lists seeded maps and exposes search', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('maps'))
    await seedMap(page, accessToken, 'Quarterly planning')
    await seedMap(page, accessToken, 'Roadmap retrospective')

    await page.goto(APP_BASE + '/maps')
    await expect(page.getByRole('heading', { name: 'Your maps' })).toBeVisible()
    await expect(page.locator('text=Quarterly planning').first()).toBeVisible()
    await expect(page.locator('text=Roadmap retrospective').first()).toBeVisible()

    // Filter by search.
    await page.getByPlaceholder(/Search maps…/i).fill('roadmap')
    await page.waitForTimeout(200)
    await expect(page.locator('text=Quarterly planning')).toHaveCount(0)
    await expect(page.locator('text=Roadmap retrospective').first()).toBeVisible()
  })

  test('"New map" button creates a row and navigates to editor', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('newmap'))
    await page.goto(APP_BASE + '/maps')
    const before = await page.request.get(`${API_BASE}/maps`, { headers: apiHeaders(accessToken) })
    const beforeBody = (await before.json()) as Array<{ id: string }>
    const beforeCount = beforeBody.length

    // click the in-page "New map" button by its id — with zero maps the page
    // legitimately shows TWO "New map" buttons (header CTA + empty-state CTA),
    // so a role/name locator strict-modes.
    await page.locator('[data-mol-id="maps-new-button"]').click()
    await page.waitForURL(/\/maps\/[0-9a-f-]{36}$/, { timeout: 10000 })
    const after = await page.request.get(`${API_BASE}/maps`, { headers: apiHeaders(accessToken) })
    const afterBody = (await after.json()) as Array<{ id: string }>
    expect(afterBody.length).toBe(beforeCount + 1)
  })
})
