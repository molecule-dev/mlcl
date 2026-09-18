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

test.describe('03: projects — create, archive, budget burn-down, hours/revenue rollups', () => {
  test('create project under client → DB has client link, budget computes from rate', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Initech',
      hourly_rate_cents: 11000,
    })
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test=new-project-toggle]').click()
    await page.locator('[data-test=project-name]').fill('TPS Reports')
    await page.locator('[data-test=project-client]').selectOption({ label: 'Initech' })
    await page.locator('[data-test=project-rate]').fill('150')
    await page.locator('[data-test=project-budget]').fill('3000')
    await page.locator('[data-test=project-submit]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=TPS Reports')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const project = arr.find((p: { name: string }) => p.name === 'TPS Reports')
    expect(project).toBeTruthy()
    expect(project.client_id).toBe(client.id)
    expect(project.hourly_rate_cents).toBe(15000)
    expect(project.budget_cents).toBe(300000)
  })

  test('project detail shows tracked hours and remaining budget after seeding entries', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Hooli',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'PiedPiper Migration',
      client_id: client.id,
      hourly_rate_cents: 20000,
      budget_cents: 400000,
    })
    // Two billable hours
    await seedEntry(page, auth.accessToken, {
      project_id: project.id,
      started_at: new Date(Date.now() - 120 * 60_000).toISOString(),
      ended_at: new Date().toISOString(),
      is_billable: true,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('[data-test=project-detail]')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'PiedPiper Migration' })).toBeVisible()
    // 2h tracked
    await expect(page.locator('text=/2h 00m/i').first()).toBeVisible()
    // Revenue $400 (2h × $200)
    await expect(page.locator('text=/\\$400(\\s|\\b)/').first()).toBeVisible()
  })

  test('projects load fires GET /api/projects, /api/clients, and /api/entries', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.waitForTimeout(1500)
    })
    const gets = reqs.filter((r) => r.method === 'GET').map((r) => r.url)
    expect(gets.some((u) => /\/api\/projects\b/.test(u))).toBe(true)
    expect(gets.some((u) => /\/api\/clients\b/.test(u))).toBe(true)
    expect(gets.some((u) => /\/api\/entries\b/.test(u))).toBe(true)
  })

  test('archive project hides it from default Projects list', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken)
    const project = await seedProject(page, auth.accessToken, {
      name: 'ArchiveMe',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-test=project-archive]').click()
    await page.waitForTimeout(2000)
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=ArchiveMe')).toHaveCount(0)
  })
})
