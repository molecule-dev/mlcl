import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  seedCompany,
  seedContact,
  seedDeal,
  seedActivity,
  signup,
} from './_helpers.js'

test.describe('crm: dashboard', () => {
  test('renders empty-state KPIs for a brand-new account (no fake +12% deltas)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/')
    await expect(page.getByTestId('page-dashboard')).toBeVisible()
    // The old hardcoded "+12%" sparkline badge MUST be gone.
    await expect(page.getByText('+12%', { exact: true })).toHaveCount(0)
    await expect(page.getByTestId('kpi-active-deals')).toContainText('0')
    await expect(page.getByTestId('kpi-won-deals')).toContainText('0')
  })

  test('reflects seeded deals + activities in KPIs and panels', async ({ page }) => {
    const session = await signup(page)
    const headers = authHeaders(session.accessToken)
    const company = await seedCompany(page, session.accessToken, { name: 'Acme Co' })
    const contact = await seedContact(page, session.accessToken, {
      company_id: company.id,
    })
    await seedDeal(page, session.accessToken, {
      title: 'Big deal',
      value: 50000,
      stage: 'proposal',
      contact_id: contact.id,
      company_id: company.id,
    })
    await seedDeal(page, session.accessToken, {
      title: 'Won deal',
      value: 10000,
      stage: 'closed_won',
    })
    const tomorrow = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await seedActivity(page, session.accessToken, {
      type: 'task',
      subject: 'Follow up tomorrow',
      due_date: tomorrow,
    })

    // Sanity: API stats are correct first.
    const statsRes = await page.request.get(`${API_BASE}/pipeline/stats`, { headers })
    const stats = (await statsRes.json()) as {
      total_open: number
      total_value: number
      won_count: number
      won_value: number
    }
    expect(stats.total_open).toBe(1)
    expect(Number(stats.total_value)).toBe(50000)
    expect(stats.won_count).toBe(1)
    expect(Number(stats.won_value)).toBe(10000)

    await page.goto(APP_BASE + '/')
    await expect(page.getByTestId('kpi-active-deals')).toContainText('1')
    await expect(page.getByTestId('kpi-won-deals')).toContainText('1')
    await expect(page.getByTestId('dashboard-top-deals')).toContainText('Big deal')
    await expect(page.getByTestId('dashboard-upcoming')).toContainText('Follow up tomorrow')
  })
})

test.describe('crm: reports', () => {
  test('reports page shows live KPI cards and pipeline breakdown for seeded deals', async ({
    page,
  }) => {
    const session = await signup(page)
    await seedDeal(page, session.accessToken, {
      title: 'Report deal A',
      value: 5000,
      stage: 'lead',
    })
    await seedDeal(page, session.accessToken, {
      title: 'Report deal B',
      value: 7000,
      stage: 'qualified',
    })
    await seedActivity(page, session.accessToken, { type: 'call', subject: 'A call' })

    await page.goto(APP_BASE + '/reports')
    await expect(page.getByTestId('reports-open-count')).toContainText('2')
    // Two stages should render with non-empty values (labels render
    // case-insensitively from the i18n fallback).
    await expect(page.getByTestId('reports-pipeline')).toContainText(/lead/i)
    await expect(page.getByTestId('reports-pipeline')).toContainText(/qualified/i)
    await expect(page.getByTestId('reports-pipeline')).toContainText('$5,000')
    await expect(page.getByTestId('reports-pipeline')).toContainText('$7,000')
    await expect(page.getByTestId('reports-activity')).toContainText('call')
  })
})

test.describe('crm: activities UI', () => {
  test('logging an activity from the UI form persists and the toggle marks it complete', async ({
    page,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/activities')

    await page.getByTestId('activities-new').click()
    await page.getByTestId('activities-form-subject').fill('Phone Tim about renewal')
    await page.getByTestId('activities-form-submit').click()

    await expect(page.getByTestId('activities-list')).toContainText('Phone Tim about renewal')

    // Verify it was POSTed to the API.
    const headers = authHeaders(session.accessToken)
    const apiRes = await page.request.get(`${API_BASE}/activities`, { headers })
    const acts = (await apiRes.json()) as Array<{ subject: string; completed: boolean; id: string }>
    const created = acts.find((a) => a.subject === 'Phone Tim about renewal')
    expect(created, 'activity should be in API').toBeDefined()
    expect(created!.completed).toBe(false)

    // Toggle it complete via the UI (use click — Playwright's .check() is
    // a no-op when the controlled input is already in the desired state by
    // the time the assertion runs).
    const row = page.getByTestId('activities-row').filter({ hasText: 'Phone Tim about renewal' })
    await row.getByTestId('activities-toggle').click()

    // Verify via API that the row flipped.
    await expect
      .poll(async () => {
        const r = await page.request.get(`${API_BASE}/activities/${created!.id}`, { headers })
        const data = (await r.json()) as { completed: boolean }
        return data.completed
      })
      .toBe(true)
  })
})
