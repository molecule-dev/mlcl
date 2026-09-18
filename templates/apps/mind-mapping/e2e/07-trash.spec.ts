import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, seedMap, signup, uniqueEmail } from './_helpers.js'

test.describe('Trash', () => {
  test('Restore puts a trashed map back on the live list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('restore'))
    const map = await seedMap(page, accessToken, 'Restore me')
    await page.request.post(`${API_BASE}/maps/${map.id}/trash`, {
      headers: apiHeaders(accessToken),
    })
    await page.goto(APP_BASE + '/trash')
    await expect(page.locator('text=Restore me')).toBeVisible()
    await page
      .getByRole('button', { name: /Restore/i })
      .first()
      .click()
    await page.waitForTimeout(500)

    const live = await page.request.get(`${API_BASE}/maps`, { headers: apiHeaders(accessToken) })
    const liveBody = (await live.json()) as Array<{ id: string; trashed_at: string | null }>
    expect(liveBody.find((m) => m.id === map.id)?.trashed_at).toBeFalsy()
  })

  test('Permanent delete removes the row entirely', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('hard-del'))
    const map = await seedMap(page, accessToken, 'Hard delete me')
    await page.request.post(`${API_BASE}/maps/${map.id}/trash`, {
      headers: apiHeaders(accessToken),
    })
    await page.goto(APP_BASE + '/trash')
    await expect(page.locator('text=Hard delete me')).toBeVisible()
    await page
      .getByRole('button', { name: /Delete forever/i })
      .first()
      .click()
    await page.waitForTimeout(500)
    const detail = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect([404, 403]).toContain(detail.status())
  })
})
