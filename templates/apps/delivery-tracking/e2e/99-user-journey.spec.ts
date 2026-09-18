import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiRequest,
  asList,
  expectNoConsoleErrors,
  promoteToAdmin,
  signup,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink flow.
 *
 * A single sign-up walks the entire user surface: dashboard → shipments
 * (create) → shipment detail → carriers (connect) → alerts (acknowledge)
 * → webhooks (create endpoint) → notifications (mark all read) → team
 * (invite) → settings (rename org) → profile (rename) → analytics →
 * pricing → plan-updated → reload-still-authed.
 *
 * The whole flow must complete with zero console errors and every
 * mutation must persist (verified via read-after-write API calls). This
 * is the gate that catches inter-page regressions a single-page spec
 * would miss.
 */

test.describe('cross-page user journey', () => {
  test('signup → CRUD across every primary page → reload stays authed, no console errors', async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const errors = expectNoConsoleErrors(page)

    const { email, name } = await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)

    // 1. Dashboard mounts with seeded data.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible()

    // 2. Create a shipment from /shipments and verify read-after-write.
    await page.goto(APP_BASE + '/shipments')
    const tracking = `JNY-${Date.now()}`
    await page.getByRole('button', { name: /\+ New shipment/i }).click()
    await page.locator('[data-mol-id="input-tracking"]').fill(tracking)
    await page.locator('[data-mol-id="input-destination"]').fill('Berlin, BE, DE')
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-new-shipment"]')).toBeHidden({
      timeout: 10_000,
    })
    const ships = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/shipments')).body)
    const created = ships.find((s) => s.tracking_number === tracking)
    expect(created, 'newly created shipment should be in /api/shipments').toBeTruthy()

    // 3. Open shipment detail.
    await page.goto(APP_BASE + `/shipments/${created!.id}`)
    await expect(page.getByRole('heading', { name: tracking })).toBeVisible()

    // 4. Connect a new carrier. Carriers are an operator-managed global
    //    catalog (writes gated behind requireAdmin, P2H-3) — become the
    //    operator before driving the connect flow.
    await promoteToAdmin(page)
    await page.goto(APP_BASE + '/carriers')
    const carrierCode = `JC${Date.now().toString().slice(-5)}`
    const carrierName = `Journey Carrier ${carrierCode}`
    await page.locator('[data-mol-id="button-connect-carrier"]').click()
    await page.locator('[data-mol-id="input-name"]').fill(carrierName)
    await page.locator('[data-mol-id="input-code"]').fill(carrierCode)
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-connect-carrier"]')).toBeHidden({
      timeout: 10_000,
    })
    const carriers = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/carriers')).body)
    expect(
      carriers.find((c) => c.name === carrierName),
      'new carrier persists',
    ).toBeTruthy()

    // 5. Acknowledge an alert if the seed produced one.
    await page.goto(APP_BASE + '/alerts')
    const alerts = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/alerts')).body)
    const ackTarget = alerts.find((a) => !a.resolved)
    if (ackTarget) {
      await page.locator(`[data-mol-id="button-acknowledge-${ackTarget.id}"]`).click()
      await page.waitForTimeout(500)
      const after = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/alerts')).body)
      const updated = after.find((a) => a.id === ackTarget.id)
      expect(updated?.resolved).toBe(true)
    }

    // 6. Create a webhook endpoint.
    await page.goto(APP_BASE + '/webhooks')
    const hookUrl = `https://journey.test/${Date.now()}`
    await page.locator('[data-mol-id="button-new-endpoint"]').click()
    await page.locator('[data-mol-id="input-url"]').fill(hookUrl)
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-new-endpoint"]')).toBeHidden({
      timeout: 10_000,
    })
    const hooks = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/webhooks')).body)
    expect(
      hooks.find((h) => h.url === hookUrl),
      'webhook persists',
    ).toBeTruthy()

    // 7. Mark all notifications read (if any unread).
    await page.goto(APP_BASE + '/notifications')
    const ns = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/notifications')).body)
    if (ns.some((n) => n.unread)) {
      await page.locator('[data-mol-id="button-mark-all-read"]').click()
      await page.waitForTimeout(500)
      const after = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/notifications')).body)
      expect(after.filter((n) => n.unread).length).toBe(0)
    }

    // 8. Invite a team member.
    await page.goto(APP_BASE + '/team')
    const inviteEmail = `journey-${Date.now()}@parcel.test`
    await page.locator('[data-mol-id="button-invite-member"]').click()
    await page.locator('[data-mol-id="input-email"]').fill(inviteEmail)
    await page.locator('[data-mol-id="select-role"]').selectOption('admin')
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-invite-member"]')).toBeHidden({
      timeout: 10_000,
    })
    const team = asList<any>((await apiRequest<unknown>(page, 'GET', '/api/team-members')).body)
    expect(
      team.find((m) => m.email === inviteEmail),
      'invitation persists',
    ).toBeTruthy()

    // 9. Rename organisation in settings.
    await page.goto(APP_BASE + '/settings')
    const orgName = `Journey Logistics ${Date.now()}`
    await page.locator('[data-mol-id="input-org-name"]').fill(orgName)
    await page.locator('[data-mol-id="button-save-org"]').click()
    await expect(page.locator('[data-mol-id="org-saved-pill"]')).toBeVisible({ timeout: 10_000 })

    // 10. Rename profile.
    await page.goto(APP_BASE + '/profile')
    const newName = `${name} (Journey)`
    await page.locator('[data-mol-id="input-name"]').fill(newName)
    await page.locator('[data-mol-id="button-save-profile"]').click()
    await expect(page.locator('[data-mol-id="profile-saved-pill"]')).toBeVisible({
      timeout: 10_000,
    })

    // 11. Analytics renders without crashing.
    await page.goto(APP_BASE + '/analytics')
    await expect(page.getByRole('heading', { name: /^Analytics$/i })).toBeVisible()

    // 12. Pricing renders without crashing.
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your Parcel plan/i })).toBeVisible({
      timeout: 15_000,
    })

    // 13. Plan-updated renders.
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })

    // 14. Reload anywhere — still authed.
    await page.goto(APP_BASE + '/dashboard')
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Operations dashboard/i })).toBeVisible({
      timeout: 10_000,
    })

    // 15. Email is what we signed up with (read from the cookie-authed
    // /users/me — [M1-1] there is no localStorage user cache anymore).
    const meResp = await page.request.get(APP_BASE + '/api/users/me')
    const me = (await meResp.json()).props as { email?: string }
    expect(me.email).toBe(email)

    // No fatal console errors during the entire walk.
    expect(errors, 'console errors during user journey').toEqual([])
  })
})
