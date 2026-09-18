import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, seedMap, signup, uniqueEmail } from './_helpers.js'

test.describe('Share', () => {
  test('Invite collaborator → row appears + survives reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('share'))
    const map = await seedMap(page, accessToken, 'Share map')
    await page.goto(APP_BASE + `/maps/${map.id}/share`)
    await page.locator('input[data-mol-id="share-invite-email"]').fill('mate@flagship.test')
    await page.locator('select[data-mol-id="share-invite-role"]').selectOption('viewer')
    await page.locator('button[data-mol-id="share-invite-button"]').click()
    await page.waitForTimeout(500)
    // Scope to the collaborator list — the success banner also contains the
    // invited email, which would otherwise yield strict-mode violations.
    await expect(
      page.locator('[data-mol-id="share-collaborator-list"]').getByText('mate@flagship.test'),
    ).toBeVisible()

    const collabRes = await page.request.get(`${API_BASE}/collaborators?map_id=${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const collabs = (await collabRes.json()) as Array<{ email: string; role: string }>
    const found = collabs.find((c) => c.email === 'mate@flagship.test')
    expect(found).toBeDefined()
    expect(found?.role).toBe('viewer')

    await page.reload()
    await expect(
      page.locator('[data-mol-id="share-collaborator-list"]').getByText('mate@flagship.test'),
    ).toBeVisible()
  })

  test('Public link toggle flips is_public + mints a slug', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('public'))
    const map = await seedMap(page, accessToken, 'Public map')
    await page.goto(APP_BASE + `/maps/${map.id}/share`)
    await page.locator('button[data-mol-id="share-public-toggle"]').click()
    await page.waitForTimeout(400)
    const res = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as { is_public: boolean; public_slug: string | null }
    expect(body.is_public).toBe(true)
    expect(body.public_slug).toBeTruthy()
    // The url field should now show the public path
    await expect(page.locator('input[data-mol-id="share-public-url"]')).toBeVisible()

    // Toggle off and verify it un-mints
    await page.locator('button[data-mol-id="share-public-toggle"]').click()
    await page.waitForTimeout(400)
    const off = await page.request.get(`${API_BASE}/maps/${map.id}`, {
      headers: apiHeaders(accessToken),
    })
    const offBody = (await off.json()) as { is_public: boolean }
    expect(offBody.is_public).toBe(false)
  })
})
