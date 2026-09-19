import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  listNotifications,
  listPostmortems,
  readIncident,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

/**
 * SIGNATURE FLOW: incident triggers -> the on-call responder is paged
 * (in-app notification) -> ack -> resolve -> postmortem with action items.
 * Every step must persist real state — a follow-up GET reflects the write.
 */
test.describe('signature paging flow', () => {
  test('trigger -> page -> ack -> resolve -> postmortem end to end', async ({ page }) => {
    // 1. Sign up; the seed provisions rotations + policies + responders.
    await signup(page, uniqueEmail('sigflow'))

    // 2. Trigger a critical incident through the API (the monitor path).
    const incident = await triggerIncident(page, {
      title: `E2E signature flow outage ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'critical',
    })
    expect(incident.status).toBe('triggered')

    // 3. The page landed in the in-app notification feed.
    const notifications = await listNotifications(page)
    const pages = notifications.filter((n) => n.kind === 'page')
    expect(pages.length).toBeGreaterThan(0)

    // 4. Open the incident detail — the pager banner is up, ack it in the UI.
    await page.goto(APP_BASE + `/incidents/${incident.id}`)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="incident-pager-banner"]')).toBeVisible()
    await page.locator('[data-mol-id="incident-ack-banner"]').click()
    await expect
      .poll(async () => (await readIncident(page, incident.id)).status, { timeout: 15_000 })
      .toBe('acknowledged')
    // The ack wrote its own notification.
    const afterAck = await listNotifications(page)
    expect(afterAck.some((n) => n.kind === 'ack')).toBe(true)

    // 5. Resolve through the UI button.
    await page.locator('[data-mol-id="incident-resolve"]').first().click()
    await expect
      .poll(async () => (await readIncident(page, incident.id)).status, { timeout: 15_000 })
      .toBe('resolved')

    // 6. Start the postmortem from the detail page and add an action item.
    await page.locator('[data-mol-id="incident-start-postmortem"]').first().click()
    await expect(page).toHaveURL(/\/postmortems\//, { timeout: 15_000 })
    const itemId = `E2E sigflow action item ${Date.now()}`
    await page.locator('[data-mol-id="postmortem-new-item-input"]').fill(itemId)
    await page.locator('[data-mol-id="postmortem-new-item-submit"]').click()
    await expect(
      page.locator('[data-mol-id^="action-item-"]', { hasText: itemId }).first(),
    ).toBeVisible({ timeout: 15_000 })

    // 7. The postmortems list reflects the new review.
    const postmortems = await listPostmortems(page)
    const detail = await readIncident(page, incident.id)
    expect(detail.postmortem_id, 'incident links its postmortem').toBeTruthy()
    expect(postmortems.some((p) => p.id === detail.postmortem_id)).toBe(true)

    // 8. Hard reload — everything persists.
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect((await readIncident(page, incident.id)).status, 'resolved survives reload').toBe(
      'resolved',
    )
  })
})
