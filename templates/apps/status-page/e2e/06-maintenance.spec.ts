import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, createComponent, listAuditFiltered, signup } from './_helpers.js'

test.describe('/maintenance', () => {
  test('Schedule window form creates a maintenance window and renders it in the list', async ({
    page,
  }) => {
    await signup(page)
    const comp = await createComponent(page, { name: `mx-${Date.now()}`, group: 'platform' })

    await page.goto(APP_BASE + '/maintenance')
    await page.getByTestId('schedule-maintenance-btn').click()
    await expect(page.getByTestId('schedule-maintenance-form')).toBeVisible()

    const title = `Maintenance ${Date.now()}`
    await page.getByTestId('maintenance-title').fill(title)
    await page.getByTestId('maintenance-message').fill('Database minor version upgrade.')

    // datetime-local needs HTML5 format yyyy-MM-ddTHH:mm
    const start = new Date(Date.now() + 60 * 60_000)
    const end = new Date(Date.now() + 90 * 60_000)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(
        d.getHours(),
      ).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    await page.getByTestId('maintenance-start').fill(fmt(start))
    await page.getByTestId('maintenance-end').fill(fmt(end))
    await page.getByTestId(`maintenance-affected-${comp.id}`).click()

    const respPromise = page.waitForResponse(
      (r) => r.url().endsWith('/maintenance') && r.request().method() === 'POST',
      { timeout: 15_000 },
    )
    await page.getByTestId('maintenance-submit').click()
    const resp = await respPromise
    expect(resp.status(), `POST /maintenance: ${await resp.text().catch(() => '')}`).toBe(201)

    await expect(page.getByTestId('schedule-maintenance-form')).toBeHidden({ timeout: 5_000 })
    await expect(page.getByText(title, { exact: false })).toBeVisible({ timeout: 5_000 })

    // Audit log entry must be created.
    const audit = await listAuditFiltered(page, {
      scope: 'maintenance',
      action: 'maintenance.create',
    })
    expect(audit.some((a) => a.summary === title)).toBeTruthy()
  })

  test('Submit is disabled until both start and end are provided', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/maintenance')
    await page.getByTestId('schedule-maintenance-btn').click()
    await page.getByTestId('maintenance-title').fill('blocked submit')
    // Without start/end, submit must remain disabled.
    await expect(page.getByTestId('maintenance-submit')).toBeDisabled()
  })

  test('issues GET /api/maintenance on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/maintenance')
      await page.waitForTimeout(1500)
    })
    const get = reqs.find((r) => /\/api\/maintenance(\?|$)/.test(r.url) && r.method === 'GET')
    expect(get?.status, 'GET /api/maintenance').toBe(200)
  })
})
