import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedEntry,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/clients/:id page', () => {
  test('client detail container + h1 visible after seeding', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Globex' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-test="client-detail"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Globex' })).toBeVisible()
  })

  test('breadcrumb "Clients" link navigates back to /clients', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Stark Industries' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await page
      .getByRole('link', { name: /^clients$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/clients$/)
  })

  test('"New invoice" CTA navigates to /invoices', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-test="client-new-invoice"]').click()
    await expect(page).toHaveURL(/\/invoices$/)
  })

  test('seeded project + tracked entry roll up onto the client detail', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Globex Corp',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Site Refresh',
      client_id: client.id,
      hourly_rate_cents: 12000,
    })
    await seedEntry(page, auth.accessToken, {
      description: 'Logo concepting',
      project_id: project.id,
      started_at: new Date(Date.now() - 60 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })

    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Site Refresh').first()).toBeVisible()
    await expect(page.locator('text=/1h 00m/').first()).toBeVisible()
  })

  test('empty-state copy renders for a fresh client', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'NoProjects Inc.' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-test="client-projects-empty"]')).toBeVisible()
    await expect(page.locator('[data-test="client-invoices-empty"]')).toBeVisible()
  })

  test('KPI "Total hours" label and value render', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'TotalsCo' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/total hours/i').first()).toBeVisible()
  })

  test('KPI "Total paid" label renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'PaidCo' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/total paid/i').first()).toBeVisible()
  })

  test('KPI "Outstanding" label renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'OutstandingCo' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/outstanding/i').first()).toBeVisible()
  })

  test('KPI "Active projects" label renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'ActivProj' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/active projects/i').first()).toBeVisible()
  })

  test('"Projects" section heading renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'ProjHdr' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /^projects$/i }).first()).toBeVisible()
  })

  test('"Recent invoices" section heading renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'InvHdr' })
    await page.goto(APP_BASE + '/clients/' + client.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /recent invoices/i }).first()).toBeVisible()
  })

  test('client detail load fires GET /api/clients/:id', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'NetCheck' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/clients/' + client.id)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/clients/${client.id}`).test(r.url)),
    ).toBeTruthy()
  })
})
