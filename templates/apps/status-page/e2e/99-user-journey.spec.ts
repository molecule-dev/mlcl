import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, listAuditFiltered, signup, uniqueEmail } from './_helpers.js'

test.describe('cross-page user journey', () => {
  test('an operator runs the full status-page workflow end-to-end', async ({ page }) => {
    test.setTimeout(180_000)
    const { accessToken } = await signup(page)
    const auth = { Authorization: `Bearer ${accessToken}` }

    // 1. Sign in -> dashboard renders.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 15_000,
    })

    // 2. Add a component via the inline form on /components.
    await page.goto(APP_BASE + '/components')
    await page.getByTestId('add-component-btn').click()
    const compName = `Journey-${Date.now()}`
    await page.getByTestId('add-component-name').fill(compName)
    await page.getByTestId('add-component-group').fill('platform')
    await page.getByTestId('add-component-submit').click()
    await expect(page.getByText(compName, { exact: false })).toBeVisible({ timeout: 10_000 })

    const list = await page.request.get(`${API_BASE}/components`, { headers: auth })
    const compId = (await list.json()).find((c: { name: string }) => c.name === compName).id

    // 3. Open an incident via the form, affecting the new component.
    await page.goto(APP_BASE + '/incidents/new')
    const incTitle = `Journey incident ${Date.now()}`
    await page.locator('#incident-title').fill(incTitle)
    await page.locator('#incident-message').fill('investigating root cause')
    await page.getByRole('button', { name: /partial outage/i }).click()
    await page.getByTestId(`affected-${compId}`).click()
    await page.getByRole('button', { name: /publish/i }).click()
    await expect(page).toHaveURL(/\/incidents$/, { timeout: 15_000 })
    await expect(page.getByText(incTitle)).toBeVisible({ timeout: 10_000 })

    // 4. Click into the incident, post a follow-up update, resolve it.
    await page.getByText(incTitle).first().click()
    await expect(page.getByRole('heading', { name: incTitle })).toBeVisible({ timeout: 15_000 })
    const updateMsg = `Customer-visible update ${Date.now()}`
    await page.getByTestId('post-status-resolved').click()
    await page.getByTestId('post-update-message').fill(updateMsg)
    await page.getByTestId('post-update-btn').click()
    await expect(page.getByText(updateMsg)).toBeVisible({ timeout: 10_000 })

    // 5. Schedule a maintenance window and confirm it shows up on the list.
    await page.goto(APP_BASE + '/maintenance')
    await page.getByTestId('schedule-maintenance-btn').click()
    const mxTitle = `Journey maintenance ${Date.now()}`
    await page.getByTestId('maintenance-title').fill(mxTitle)
    const start = new Date(Date.now() + 60 * 60_000)
    const end = new Date(Date.now() + 90 * 60_000)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(
        d.getHours(),
      ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    await page.getByTestId('maintenance-start').fill(fmt(start))
    await page.getByTestId('maintenance-end').fill(fmt(end))
    await page.getByTestId(`maintenance-affected-${compId}`).click()
    await page.getByTestId('maintenance-submit').click()
    await expect(page.getByText(mxTitle)).toBeVisible({ timeout: 10_000 })

    // 6. Add a subscriber.
    await page.goto(APP_BASE + '/subscribers')
    await page.getByTestId('invite-subscriber-btn').click()
    const subEmail = uniqueEmail('journey-sub')
    await page.getByTestId('invite-destination').fill(subEmail)
    await page.getByTestId('invite-submit').click()
    await expect(page.getByText(subEmail)).toBeVisible({ timeout: 10_000 })

    // 7. Add a team member.
    await page.goto(APP_BASE + '/team')
    await page.getByTestId('invite-team-btn').click()
    const memberName = `Member ${Date.now()}`
    await page.getByTestId('invite-team-name').fill(memberName)
    await page.getByTestId('invite-team-email').fill(uniqueEmail('journey-team'))
    await page.getByTestId('invite-team-submit').click()
    await expect(page.getByText(memberName)).toBeVisible({ timeout: 10_000 })

    // 8. Verify audit log knows about every action.
    const auditCreates = await listAuditFiltered(page, {})
    const seen = new Set(auditCreates.map((a) => a.action))
    for (const expected of [
      'component.create',
      'incident.create',
      'incident.statusChange',
      'maintenance.create',
      'subscriber.create',
      'team.create',
    ]) {
      expect(seen, `audit must include ${expected}`).toContain(expected)
    }

    // 9. Anonymous public page reflects the artefacts the operator just created.
    await page.context().clearCookies()
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(compName)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(incTitle, { exact: false })).toBeVisible({ timeout: 15_000 })
  })
})
