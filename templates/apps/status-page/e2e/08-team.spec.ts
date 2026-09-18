import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, listAuditFiltered, signup, uniqueEmail } from './_helpers.js'

test.describe('/team', () => {
  test('Invite member form creates a team member; the page reflects the member', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')

    await page.getByTestId('invite-team-btn').click()
    await expect(page.getByTestId('invite-team-form')).toBeVisible()

    const memberName = `Team-${Date.now()}`
    const memberEmail = uniqueEmail('team-ui')
    await page.getByTestId('invite-team-name').fill(memberName)
    await page.getByTestId('invite-team-email').fill(memberEmail)
    await page.getByTestId('invite-team-role').selectOption('operator')

    const respPromise = page.waitForResponse(
      (r) => r.url().endsWith('/team') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('invite-team-submit').click()
    const resp = await respPromise
    expect(resp.status(), `POST /team: ${await resp.text().catch(() => '')}`).toBe(201)

    await expect(page.getByText(memberName, { exact: false })).toBeVisible({ timeout: 5_000 })

    const audit = await listAuditFiltered(page, { scope: 'team', action: 'team.create' })
    expect(
      audit.some((a) => typeof a.summary === 'string' && a.summary.includes(memberName)),
    ).toBeTruthy()
  })

  test('Invite is disabled when name or email is missing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/team')
    await page.getByTestId('invite-team-btn').click()
    await expect(page.getByTestId('invite-team-submit')).toBeDisabled()
    await page.getByTestId('invite-team-name').fill('Name only')
    await expect(page.getByTestId('invite-team-submit')).toBeDisabled()
  })

  test('issues GET /api/team on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/team')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/team(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/team').toBe(200)
  })
})
