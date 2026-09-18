import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiSignup,
  authedApi,
  captureNetwork,
  createProject,
  signup,
  whereUrl,
} from './_helpers.js'

test.describe('Dashboard page (/dashboard)', () => {
  test('after signup, dashboard shows the welcome heading + studio overview eyebrow', async ({
    page,
  }) => {
    await signup(page)
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: /Welcome back to the booth/i })).toBeVisible()
    await expect(page.getByText(/Studio overview/i)).toBeVisible()
  })

  test('top "New project" CTA routes to /projects', async ({ page }) => {
    await signup(page)
    await page
      .getByRole('link', { name: /new project/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('"Recent projects" heading + "View all" link → /projects', async ({ page }) => {
    await signup(page)
    await expect(page.getByRole('heading', { name: /Recent projects/i })).toBeVisible()
    await page
      .getByRole('link', { name: /view all/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('"Sample library highlights" heading + "Browse the library" → /samples', async ({
    page,
  }) => {
    await signup(page)
    await expect(page.getByRole('heading', { name: /Sample library highlights/i })).toBeVisible()
    await page.getByRole('link', { name: /browse the library/i }).click()
    await expect(page).toHaveURL(/\/samples$/)
  })

  test('initial load fetches /api/projects AND /api/samples (no 5xx)', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.waitForLoadState('networkidle')
    })
    const projects = whereUrl(reqs, /\/api\/projects(?!\/)/, 'GET')
    const samples = whereUrl(reqs, /\/api\/samples(?!\/)/, 'GET')
    expect(projects.length, 'GET /api/projects fired').toBeGreaterThan(0)
    expect(samples.length, 'GET /api/samples fired').toBeGreaterThan(0)
    expect(projects[0].status, 'projects must succeed').toBeLessThan(300)
    expect(samples[0].status, 'samples must succeed').toBeLessThan(300)
  })

  test('empty-state CTA "Create your first project" → /projects (fresh signup)', async ({
    page,
  }) => {
    await signup(page)
    const cta = page.getByRole('link', { name: /create your first project/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/projects$/)
  })

  test('after creating a project via API, dashboard hero card shows it', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const proj = await createProject(request, u.accessToken!, { name: 'Hero Project Test' })
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByText(proj.name)).toBeVisible({ timeout: 10_000 })
  })

  test('anonymous /dashboard redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })

  test('GET /api/projects with auth returns array (invariant: no 5xx for empty state)', async ({
    request,
  }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    const res = await api.get('/projects')
    expect(res.status()).toBeLessThan(300)
    const body = await res.json()
    const list = Array.isArray(body) ? body : (body.data ?? body.props ?? body.items ?? body)
    expect(Array.isArray(list)).toBe(true)
  })
})
