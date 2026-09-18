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

test.describe('/projects/:id page', () => {
  test('project detail container + h1 visible after seeding a project', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Hooli' })
    const project = await seedProject(page, auth.accessToken, {
      name: 'PiedPiper Migration',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-test="project-detail"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'PiedPiper Migration' })).toBeVisible()
  })

  test('breadcrumb "Projects" link navigates back to /projects', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'Breadcrumb Project',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page
      .getByRole('link', { name: /^projects$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('seeded entries roll up tracked hours + revenue on the detail page', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Hooli',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'PiedPiper Audit',
      client_id: client.id,
      hourly_rate_cents: 20000,
      budget_cents: 400000,
    })
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test="project-detail"]')).toBeVisible()
    await expect(page.locator('text=/2h 00m/i').first()).toBeVisible()
    await expect(page.locator('text=/\\$400(\\s|\\b)/').first()).toBeVisible()
  })

  test('empty state visible for a freshly-created project', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'Untouched',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-test="project-entries-empty"]')).toBeVisible()
  })

  test('archive button hides the project from the default Projects list', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'ArchiveMe',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-test="project-archive"]').click()
    await page.waitForTimeout(2000)
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=ArchiveMe')).toHaveCount(0)
  })

  test('KPI cell "Tracked" renders on detail', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'KPITracked',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/tracked/i').first()).toBeVisible()
  })

  test('KPI cell "Remaining" renders on detail', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'KPIRemaining',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/remaining/i').first()).toBeVisible()
  })

  test('KPI cell "Revenue" renders on detail', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'KPIRevenue',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=/revenue/i').first()).toBeVisible()
  })

  test('"Budget burn-down" h2 heading renders', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'BurnDown',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /budget burn-down/i })).toBeVisible()
  })

  test('"View all" entries link navigates to /entries', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'ViewAll',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: /view all/i }).click()
    await expect(page).toHaveURL(/\/entries$/)
  })

  test('detail page fires GET /api/projects/:id', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'NetCheck',
      client_id: client.id,
    })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects/' + project.id)
      await page.waitForLoadState('networkidle')
    })
    expect(
      reqs.find((r) => r.method === 'GET' && new RegExp(`/api/projects/${project.id}`).test(r.url)),
    ).toBeTruthy()
  })
})
