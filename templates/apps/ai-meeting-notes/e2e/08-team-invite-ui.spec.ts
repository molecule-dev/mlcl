import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

test.describe('team invite UI', () => {
  test('clicking Invite teammate opens dialog, sends email, persists to API', async ({ page }) => {
    const email = uniqueEmail('aimn-team-ui')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const tokRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const token = ((await tokRes.json()) as { accessToken: string }).accessToken

    await page.goto(APP_BASE + '/team')
    await expect(page.getByRole('heading', { name: /^team$/i })).toBeVisible()

    // Open the invite dialog.
    await page.getByRole('button', { name: /invite teammate/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const inviteEmail = `invite-ui.${Date.now()}@example.com`
    await page.getByLabel(/work email/i).fill(inviteEmail)
    await page.getByRole('combobox').first().selectOption('Admin')
    await page.getByRole('button', { name: /send invitation/i }).click()

    // Dialog closes.
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5_000 })
    // Pending row appears.
    await expect(page.getByText(inviteEmail)).toBeVisible()
    await expect(page.getByText(/pending invitations \(1\)/i)).toBeVisible()

    // Backend invariant: GET /api/team has the new row pending.
    const list = (await fetch(API_BASE + '/api/team'.replace('/api', ''), {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    const row = list.find((r) => r.email === inviteEmail)
    expect(row?.pending).toBe(true)
    expect(row?.role).toBe('Admin')

    // Reload the page; the row must still be there (real persistence).
    await page.reload()
    await expect(page.getByText(inviteEmail)).toBeVisible()
  })

  test('Cancel button on pending row removes it via DELETE /api/team/:id', async ({ page }) => {
    const email = uniqueEmail('aimn-team-cancel')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const tokRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const token = ((await tokRes.json()) as { accessToken: string }).accessToken

    const inviteEmail = `invite-cancel.${Date.now()}@example.com`
    await fetch(API_BASE + '/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: inviteEmail, role: 'member' }),
    })

    await page.goto(APP_BASE + '/team')
    await expect(page.getByText(inviteEmail)).toBeVisible()
    await page
      .getByRole('button', { name: /^cancel$/i })
      .first()
      .click()

    await expect(page.getByText(inviteEmail)).not.toBeVisible({ timeout: 5_000 })

    // Backend invariant: GET shows it gone.
    const list = (await fetch(API_BASE + '/team', {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json())) as Array<Record<string, unknown>>
    const row = list.find((r) => r.email === inviteEmail)
    expect(row).toBeUndefined()
  })
})

test.describe('action items UI toggle', () => {
  test('clicking the status badge flips it from open to done and persists', async ({ page }) => {
    const email = uniqueEmail('aimn-act-ui')
    const password = 'TestPass123!'
    await signup(page, email, password)
    const tokRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const token = ((await tokRes.json()) as { accessToken: string }).accessToken

    const meeting = (await fetch(API_BASE + '/meetings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: 'Toggle test',
        source: 'recorded',
        duration_minutes: 5,
        attendees: [],
      }),
    }).then((r) => r.json())) as { id: string }
    const ai = (await fetch(API_BASE + '/action_items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ description: 'Toggle this status', meeting_id: meeting.id }),
    }).then((r) => r.json())) as { id: string }

    await page.goto(APP_BASE + '/actions')
    await expect(page.getByText(/toggle this status/i)).toBeVisible()

    // The status button reads 'open'.
    const btn = page.getByRole('button', { name: /mark as done/i }).first()
    await expect(btn).toBeVisible()
    // Arm wait BEFORE the click so we observe the PUT/PATCH that flips status.
    const writePromise = page.waitForResponse(
      (resp) => {
        const method = resp.request().method()
        return (
          (method === 'PUT' || method === 'PATCH') && /\/api\/action_items\/[^/]+/.test(resp.url())
        )
      },
      { timeout: 10_000 },
    )
    await btn.click()
    const writeResp = await writePromise
    expect(writeResp.status(), 'PUT/PATCH /api/action_items/:id should succeed').toBeLessThan(400)

    // After toggle, the badge text changes.
    await expect(page.getByRole('button', { name: /mark as open/i }).first()).toBeVisible({
      timeout: 5_000,
    })

    // Backend invariant: GET shows status=done. Poll to allow for any read-after-write
    // delay rather than asserting on a single fetched snapshot.
    await expect
      .poll(
        async () => {
          const list = (await fetch(API_BASE + '/action_items', {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => r.json())) as Array<Record<string, unknown>>
          const row = list.find((r) => r.id === ai.id)
          return row?.status
        },
        { timeout: 5_000 },
      )
      .toBe('done')

    // Reload the page; the toggle persists.
    await page.reload()
    await expect(page.getByRole('button', { name: /mark as open/i }).first()).toBeVisible({
      timeout: 5_000,
    })
  })
})
