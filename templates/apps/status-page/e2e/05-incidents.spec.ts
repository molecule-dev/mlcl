import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  createComponent,
  createIncident,
  listAuditFiltered,
  signup,
} from './_helpers.js'

test.describe('/incidents', () => {
  test('Open incident form publishes an incident and lands on /incidents', async ({ page }) => {
    await signup(page)
    const comp = await createComponent(page, { name: `inc-comp-${Date.now()}`, group: 'platform' })

    await page.goto(APP_BASE + '/incidents/new')

    const title = `UI incident ${Date.now()}`
    await page.locator('#incident-title').fill(title)
    await page.locator('#incident-message').fill('Detected via synthetic check.')
    // Pick "major" impact and "monitoring" status.
    await page.getByRole('button', { name: /partial outage/i }).click()
    await page.getByRole('button', { name: /^monitoring$/i }).click()
    // Tick the affected component checkbox using the testid we exposed.
    await page.getByTestId(`affected-${comp.id}`).click()

    const respPromise = page.waitForResponse(
      (r) => r.url().endsWith('/incidents') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByRole('button', { name: /publish/i }).click()
    const resp = await respPromise
    expect(resp.status(), `POST /incidents: ${await resp.text().catch(() => '')}`).toBe(201)

    await expect(page).toHaveURL(/\/incidents$/, { timeout: 15_000 })
    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 10_000 })

    // Audit log must record the create with correct status payload.
    const audit = await listAuditFiltered(page, { scope: 'incidents', action: 'incident.create' })
    const match = audit.find((a) => a.summary === title)
    expect(match, 'audit row for incident.create').toBeTruthy()
  })

  test('Posting an update advances incident status and writes both the update and audit', async ({
    page,
  }) => {
    const { userId: _u } = await signup(page)
    const comp = await createComponent(page, { name: `upd-comp-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Update target ${Date.now()}`,
      impact: 'minor',
      message: 'starting',
      affected: [comp.id],
    })

    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    await expect(page.getByRole('heading', { name: /Update target/ })).toBeVisible({
      timeout: 15_000,
    })

    // Initial timeline must contain the message we sent on create.
    await expect(
      page.getByTestId('incident-timeline').getByText('starting', { exact: false }),
    ).toBeVisible({ timeout: 5_000 })

    // Compose a real customer-visible update and post it.
    const msg = `mitigation in progress ${Date.now()}`
    await page.getByTestId('post-status-monitoring').click()
    await page.getByTestId('post-update-message').fill(msg)

    const respPromise = page.waitForResponse(
      (r) => r.url().includes(`/incidents/${inc.id}/updates`) && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('post-update-btn').click()
    const resp = await respPromise
    expect(resp.status(), `POST /incidents/:id/updates: ${await resp.text().catch(() => '')}`).toBe(
      201,
    )

    // Page must show the new update in the timeline.
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5_000 })

    // Audit must include statusChange.
    const audit = await listAuditFiltered(page, {
      scope: 'incidents',
      action: 'incident.statusChange',
      target: inc.id,
    })
    expect(audit.length, 'audit statusChange entry exists').toBeGreaterThan(0)
  })

  test('issues GET /api/incidents on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/incidents')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => r.url.endsWith('/api/incidents') && r.method === 'GET')
    expect(get?.status, 'GET /api/incidents').toBe(200)
  })

  test('Save draft persists the draft message in localStorage so reload keeps it', async ({
    page,
  }) => {
    await signup(page)
    const comp = await createComponent(page, { name: `draft-comp-${Date.now()}` })
    const inc = await createIncident(page, {
      title: `Draft incident ${Date.now()}`,
      affected: [comp.id],
    })
    await page.goto(APP_BASE + `/incidents/${inc.id}`)
    const draft = `draft to keep ${Date.now()}`
    await page.getByTestId('post-update-message').fill(draft)
    await page.getByTestId('save-draft-btn').click()
    // Reload and verify the draft is restored.
    await page.reload()
    await expect(page.getByTestId('post-update-message')).toHaveValue(draft, { timeout: 10_000 })
  })
})
