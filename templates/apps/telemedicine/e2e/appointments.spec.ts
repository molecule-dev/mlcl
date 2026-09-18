import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getAppointments, signup } from './_helpers.js'

test.describe('/appointments — Schedule list', () => {
  test('Unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/appointments')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('Renders heading + Schedule CTA + filter chips', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments')
    await expect(page.getByRole('heading', { level: 1, name: /^Appointments$/ })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('button', { name: /\+\s*Schedule/i })).toBeVisible()
    for (const f of ['Upcoming', 'Today', 'Completed', 'Cancelled', 'All']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${f}$`, 'i') })).toBeVisible()
    }
  })

  test('Calls GET /api/appointments on initial load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/appointments')
      await expect(page.getByRole('heading', { level: 1, name: /^Appointments$/ })).toBeVisible({
        timeout: 15000,
      })
    })
    const hit = reqs.find((r) => r.method === 'GET' && /\/api\/appointments(\?|$)/.test(r.url))
    expect(hit, 'must call GET /api/appointments on load').toBeTruthy()
    expect(hit!.status).toBeLessThan(400)
  })

  test('Schedule button navigates to /providers', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments')
    await page.getByRole('button', { name: /\+\s*Schedule/i }).click()
    await expect(page).toHaveURL(/\/providers$/, { timeout: 10000 })
  })

  test('Filter chips toggle aria-pressed when clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments')
    const todayChip = page.getByRole('button', { name: /^Today$/i })
    await expect(todayChip).toBeVisible()
    await todayChip.click()
    await expect(todayChip).toHaveAttribute('aria-pressed', 'true')
    const allChip = page.getByRole('button', { name: /^All$/i })
    await allChip.click()
    await expect(allChip).toHaveAttribute('aria-pressed', 'true')
    await expect(todayChip).toHaveAttribute('aria-pressed', 'false')
  })

  test('An appointment row appears under "All" and links to /consult/:id', async ({ page }) => {
    const { accessToken } = await signup(page)
    // Read the row under test from the same endpoint the page reads, so the
    // spec holds once the starter appointments are replaced.
    const appointments = await getAppointments(page, accessToken)
    expect(appointments.length, 'the patient must have at least one appointment').toBeGreaterThan(0)
    const target = appointments[0]
    await page.goto(APP_BASE + '/appointments')
    await page.getByRole('button', { name: /^All$/i }).click()
    const row = page
      .getByRole('link')
      .filter({ hasText: target.reason ?? target.patient_name ?? '' })
      .first()
    await expect(row).toBeVisible({ timeout: 15000 })
    const href = await row.getAttribute('href')
    expect(href, 'appointment link must point to /consult/:id or /patients/:id').toMatch(
      /\/(consult|patients)\//,
    )
  })

  test('Empty filter ("Cancelled" with no cancelled rows) shows the empty-state copy', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/appointments')
    await page.getByRole('button', { name: /^Cancelled$/i }).click()
    await expect(page.getByText(/No appointments match this filter/i)).toBeVisible({
      timeout: 10000,
    })
  })
})
