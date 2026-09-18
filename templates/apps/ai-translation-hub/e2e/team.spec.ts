import { test, expect, request as pwRequest } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/team: invite + role change', () => {
  test('GET /api/team fires on /team page load', async ({ page }) => {
    await signup(page)
    // Register waitForResponse BEFORE navigation. With await page.goto()
    // first, the /team page mounts + the team handler completes before
    // the listener attaches, so the 200 response is missed and the wait
    // hangs to timeout. Promise.all guarantees the listener is live for
    // the very first request triggered by the navigation.
    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            /\/api\/team(\?|$)/.test(r.url()) &&
            r.request().method() === 'GET' &&
            r.status() === 200,
          { timeout: 15_000 },
        ),
        page.goto(APP_BASE + '/team'),
      ])
    })
    expect(reqs.find((r) => /\/api\/team/.test(r.url) && r.method === 'GET')).toBeDefined()
  })

  test('Team heading is visible on the page', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('heading', { name: /^team$/i }).first()).toBeVisible()
  })

  test('invite then update the member role via /api/team/:id', async ({ page }) => {
    // Create the invitee user *first* in an isolated request context so
    // the cookies it sets don't override the owner session we need next.
    const inviteEmail = uniqueEmail('invitee').toLowerCase()
    const inviteeCtx = await pwRequest.newContext()
    const reg = await inviteeCtx.post(`${API_BASE}/users`, {
      data: { email: inviteEmail, password: 'TestPass!1234' },
      failOnStatusCode: false,
    })
    expect(reg.status()).toBeLessThan(300)
    await inviteeCtx.dispose()

    // Now sign up the owner and invite via the same email — the team
    // handler resolves member_user_id from the existing users row, which
    // makes the row render as "active" in the table.
    const { accessToken } = await signup(page)
    const seeded = await page.request.post(`${API_BASE}/team`, {
      headers: apiHeaders(accessToken),
      data: { email: inviteEmail, role: 'translator' },
      failOnStatusCode: true,
    })
    const body = (await seeded.json()) as { id: string }
    const memberId = body.id

    await page.goto(APP_BASE + '/team')
    const editBtn = page.locator(`button[data-mol-id="team-edit-${memberId}"]`).first()
    await expect(editBtn).toBeVisible({ timeout: 15_000 })
    await editBtn.click()
    await page.locator(`select[data-mol-id="team-edit-role-${memberId}"]`).selectOption('admin')
    await page.locator(`button[data-mol-id="team-edit-save-${memberId}"]`).click()

    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API_BASE}/team`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const list = (await r.json()) as Array<Record<string, unknown>>
          return list.find((m) => m.id === memberId)?.role
        },
        { timeout: 10_000 },
      )
      .toBe('admin')
  })

  test('inviting a brand-new email lands the row in pending and surfaces resend', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const inviteEmail = uniqueEmail('pending').toLowerCase()
    const seeded = await page.request.post(`${API_BASE}/team`, {
      headers: apiHeaders(accessToken),
      data: { email: inviteEmail, role: 'translator' },
      failOnStatusCode: true,
    })
    const body = (await seeded.json()) as { id: string }
    const memberId = body.id

    await page.goto(APP_BASE + '/team')
    const resend = page.locator(`button[data-mol-id="team-resend-${memberId}"]`).first()
    await expect(resend).toBeVisible({ timeout: 15_000 })
    await resend.click()
    // Backend round-trip: the role is unchanged and the member still
    // belongs to the workspace owner.
    await expect
      .poll(
        async () => {
          const r = await page.request.get(`${API_BASE}/team`, {
            headers: apiHeaders(accessToken),
            failOnStatusCode: false,
          })
          const list = (await r.json()) as Array<Record<string, unknown>>
          return list.find((m) => m.id === memberId)?.role
        },
        { timeout: 10_000 },
      )
      .toBe('translator')
  })
})
