import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/projects page', () => {
  test('projects page root + h1 visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.locator('[data-test="projects-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /^projects$/i })).toBeVisible()
  })

  test('empty-state visible for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.locator('[data-test="projects-empty"]')).toBeVisible()
  })

  test('toggle reveals the create-project form with all fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await expect(page.locator('[data-test="new-project-form"]')).toBeVisible()
    await expect(page.locator('[data-test="project-name"]')).toBeVisible()
    await expect(page.locator('[data-test="project-client"]')).toBeVisible()
    await expect(page.locator('[data-test="project-rate"]')).toBeVisible()
    await expect(page.locator('[data-test="project-budget"]')).toBeVisible()
    await expect(page.locator('[data-test="project-billable"]')).toBeVisible()
    await expect(page.locator('[data-test="project-submit"]')).toBeVisible()
  })

  test('create project under client → row appears, DB has client link & rates', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Initech',
      hourly_rate_cents: 11000,
    })
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await page.locator('[data-test="project-name"]').fill('TPS Reports')
    await page.locator('[data-test="project-client"]').selectOption({ label: 'Initech' })
    await page.locator('[data-test="project-rate"]').fill('150')
    await page.locator('[data-test="project-budget"]').fill('3000')
    await page.locator('[data-test="project-submit"]').click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=TPS Reports')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/projects`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const project = arr.find((p: { name: string }) => p.name === 'TPS Reports')
    expect(project, 'project persisted in DB').toBeTruthy()
    expect(project.client_id).toBe(client.id)
    expect(project.hourly_rate_cents).toBe(15000)
    expect(project.budget_cents).toBe(300000)
  })

  test('seeded project row links to /projects/:id', async ({ page }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, { name: 'Globex' })
    const project = await seedProject(page, auth.accessToken, {
      name: 'Aperture Initiative',
      client_id: client.id,
    })
    await page.goto(APP_BASE + '/projects')
    await page.waitForLoadState('domcontentloaded')
    await page.locator(`[data-test="project-row-${project.id}"]`).click()
    await page.waitForURL(`**/projects/${project.id}`, { timeout: 10000 })
    await expect(page.locator('[data-test="project-detail"]')).toBeVisible()
  })

  test('projects h1 heading explicitly renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByRole('heading', { name: /^projects$/i })).toBeVisible()
  })

  test('project-name field accepts typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await page.locator('[data-test="project-name"]').fill('Apollo')
    await expect(page.locator('[data-test="project-name"]')).toHaveValue('Apollo')
  })

  test('project-client combobox is rendered (default "Internal")', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await expect(page.locator('[data-test="project-client"]')).toBeVisible()
  })

  test('project-rate field accepts numeric input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await page.locator('[data-test="project-rate"]').fill('200')
    await expect(page.locator('[data-test="project-rate"]')).toHaveValue('200')
  })

  test('project-budget field accepts numeric input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    await page.locator('[data-test="project-budget"]').fill('5000')
    await expect(page.locator('[data-test="project-budget"]')).toHaveValue('5000')
  })

  test('project-billable checkbox toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.locator('[data-test="new-project-toggle"]').click()
    const cb = page.locator('[data-test="project-billable"]')
    const initial = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !initial })
  })

  test('projects load fires GET /api/projects and GET /api/clients', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/projects/.test(r.url))).toBeTruthy()
    expect(reqs.find((r) => r.method === 'GET' && /\/api\/clients/.test(r.url))).toBeTruthy()
  })
})
