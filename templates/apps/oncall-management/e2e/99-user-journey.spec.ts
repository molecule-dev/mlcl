import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  ackIncident,
  getOverview,
  inviteTeamMember,
  listIncidents,
  listPolicies,
  listPostmortems,
  listSchedules,
  readIncident,
  resolveIncident,
  signup,
  triggerIncident,
  uniqueEmail,
} from './_helpers.js'

/**
 * End-to-end journey of a brand new Klaxon user. Every step must persist
 * real state in Postgres — a follow-up GET reflects the write, the
 * workspace survives reload, and the seeded demo data shows up exactly
 * where the UI claims it lives.
 */
test.describe('user journey: signup -> page -> ack -> resolve -> review', () => {
  test('walks the primary flow end to end', async ({ page }) => {
    // 1. Sign up.
    const { email, accessToken } = await signup(page, uniqueEmail('journey'))
    expect(accessToken).toBeTruthy()

    // 2. Land on /dashboard — on-call now renders per schedule.
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    const overview = await getOverview(page)
    expect(overview.oncall_now.length).toBeGreaterThan(0)
    for (const entry of overview.oncall_now.slice(0, 2)) {
      if (entry.oncall) {
        await expect(
          page.locator('a[href^="/schedules/"]', { hasText: entry.oncall!.name }).first(),
        ).toBeVisible()
      }
    }

    // 3. Trigger + triage one incident — resolve it, read-after-write.
    const incidents = await listIncidents(page)
    expect(incidents.length).toBeGreaterThan(0)
    const target = incidents.find((i) => i.status === 'triggered') ?? incidents[0]!
    if (target.status === 'triggered') {
      // ack then resolve through the API (UI paths covered elsewhere)
      await ackIncident(page, target.id)
    }
    await resolveIncident(page, target.id)
    expect((await readIncident(page, target.id)).status).toBe('resolved')

    // 4. Invite a responder.
    const inviteEmail = uniqueEmail('teammate')
    const invite = await inviteTeamMember(page, { email: inviteEmail, role: 'responder' })
    expect(invite.email).toBe(inviteEmail)
    await page.goto(APP_BASE + '/team')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(inviteEmail)

    // 5. Escalation policies render their ladders.
    const policies = await listPolicies(page)
    expect(policies.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/escalation-policies')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(policies[0]!.name)

    // 6. Schedules page shows rotation cards.
    const schedules = await listSchedules(page)
    expect(schedules.length).toBeGreaterThan(0)
    await page.goto(APP_BASE + '/schedules')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(schedules[0]!.name)

    // 7. Postmortems exist from the seed.
    const postmortems = await listPostmortems(page)
    expect(postmortems.length).toBeGreaterThan(0)

    // 8. Profile page shows the user's email.
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(email)

    // 9. Hard reload — every change still persists.
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect((await readIncident(page, target.id)).status, 'resolved survives reload').toBe(
      'resolved',
    )
    const incidentsAfter = await listIncidents(page)
    expect(incidentsAfter.length).toBeGreaterThanOrEqual(incidents.length)
    // A brand-new trigger still works after the journey.
    const created = await triggerIncident(page, {
      title: `E2E journey trailing trigger ${Date.now()}`,
      service: 'e2e-canary-service',
      severity: 'info',
    })
    expect(created.status).toBe('triggered')
  })
})
