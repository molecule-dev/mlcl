import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, seedMap, signup, uniqueEmail } from './_helpers.js'

test.describe('Notifications', () => {
  test('Empty state when no invites', async ({ page }) => {
    await signup(page, uniqueEmail('empty-notif'))
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('text=No pending invites')).toBeVisible()
  })

  test('Pending invite shows up + Accept marks accepted_at', async ({ page, browser }) => {
    // Signup user A — they own a map and invite user B
    const aEmail = uniqueEmail('owner')
    const { accessToken: aToken } = await signup(page, aEmail)
    const map = await seedMap(page, aToken, 'Invite map')
    const bEmail = uniqueEmail('invitee')
    // Pre-create user B so accept() finds a real user_id (the handler may
    // require a registered user, depending on impl) — but creating the
    // user is harmless either way.
    const ctx2 = await browser.newContext()
    const page2 = await ctx2.newPage()
    const { accessToken: bToken, userId: bUserId } = await signup(page2, bEmail)

    // A invites B
    const inv = await page.request.post(`${API_BASE}/collaborators`, {
      headers: apiHeaders(aToken),
      data: { map_id: map.id, email: bEmail, role: 'editor' },
    })
    expect(inv.status()).toBe(201)
    const invBody = (await inv.json()) as { id: string }

    // B logs in and sees the invite
    await page2.goto(APP_BASE + '/notifications')
    await expect(page2.locator('text=Invite map')).toBeVisible()
    await page2.locator('button[data-mol-id="notification-accept"]').first().click()
    await page2.waitForTimeout(500)

    // Read-after-write — collaborator now has accepted_at populated
    const collabsAfter = await page.request.get(`${API_BASE}/collaborators?map_id=${map.id}`, {
      headers: apiHeaders(aToken),
    })
    const list = (await collabsAfter.json()) as Array<{
      id: string
      accepted_at: string | null
      user_id: string | null
    }>
    const accepted = list.find((c) => c.id === invBody.id)
    expect(accepted?.accepted_at).toBeTruthy()
    expect(accepted?.user_id).toBe(bUserId)

    await ctx2.close()
  })
})
