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

test.describe('Projects page (/projects)', () => {
  test('shows the page heading and "New project" CTA', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByRole('heading', { name: /^Projects$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /new project/i })).toBeVisible()
  })

  test('clicking "New project" opens a dialog with required name input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /new project/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const nameInput = dialog.locator('input[required]').first()
    await expect(nameInput).toBeVisible()
    await expect(nameInput).toBeFocused()
  })

  test('Cancel inside the modal closes it and does NOT POST /api/projects', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.getByRole('button', { name: /new project/i }).click()
      await page.getByRole('button', { name: /^Cancel$/ }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0)
    })
    const post = whereUrl(reqs, /\/api\/projects(?!\/)/, 'POST')
    expect(post.length, 'cancelling must not POST').toBe(0)
  })

  test('submitting the modal POSTs /api/projects 201 and navigates to /projects/:id', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.getByRole('button', { name: /new project/i }).click()
      const dialog = page.getByRole('dialog')
      await dialog
        .locator('input[required]')
        .first()
        .fill('Studio Test ' + Date.now())
      await page.getByRole('button', { name: /create project/i }).click()
      await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 15_000 })
    })
    const post = whereUrl(reqs, /\/api\/projects(?!\/)/, 'POST')
    expect(post.length, 'POST /api/projects must fire').toBeGreaterThan(0)
    expect(post[0].status).toBe(201)
  })

  test('a freshly-created project appears in the GET /api/projects list', async ({
    page,
    request,
  }) => {
    const u = await apiSignup(request)
    const created = await createProject(request, u.accessToken!, {
      name: 'List Verify ' + Date.now(),
    })
    const api = authedApi(request, u.accessToken!)
    const listRes = await api.get('/projects')
    const list = await listRes.json()
    const arr = Array.isArray(list) ? list : (list.data ?? list.items ?? list.props ?? list)
    expect(Array.isArray(arr)).toBe(true)
    expect(
      arr.some((p: { id: string }) => p.id === created.id),
      'created project is in list',
    ).toBe(true)
  })

  test('All / Pinned / Recent filter chips are present and selectable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    for (const label of ['All', 'Pinned', 'Recent']) {
      const chip = page.getByRole('button', { name: new RegExp(`^${label}$`) })
      await expect(chip).toBeVisible()
      await chip.click()
      await page.waitForTimeout(100)
    }
  })

  test('empty-state copy is shown after a fresh signup with no projects', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByText(/No projects yet/i)).toBeVisible()
  })

  test('Pinned filter narrows the list to only pinned projects', async ({ page, request }) => {
    const u = await apiSignup(request)
    const api = authedApi(request, u.accessToken!)
    await createProject(request, u.accessToken!, { name: 'Unpinned A ' + Date.now() })
    const pinnedRes = await api.post('/projects', {
      name: 'Pinned B ' + Date.now(),
      is_pinned: true,
    })
    expect(pinnedRes.status()).toBe(201)
    await page.goto(APP_BASE + '/login')
    await page.locator('#email').fill(u.email)
    await page.locator('#password').fill(u.password)
    await page.getByRole('button', { name: /open the studio|sign\s*in/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /^Pinned$/ }).click()
    await expect(page.getByText(/Pinned B/i)).toBeVisible()
    await expect(page.getByText(/Unpinned A/i)).toHaveCount(0)
  })

  test('initial GET /api/projects fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/projects')
      await page.waitForLoadState('networkidle')
    })
    const get = whereUrl(reqs, /\/api\/projects(?!\/)/, 'GET')
    expect(get.length).toBeGreaterThan(0)
    expect(get[0].status).toBeLessThan(300)
  })

  test('new tile appears in the grid after submit (read-after-write through the UI)', async ({
    page,
  }) => {
    await signup(page)
    const name = 'GridProof ' + Date.now()
    await page.goto(APP_BASE + '/projects')
    await page.getByRole('button', { name: /new project/i }).click()
    await page.getByRole('dialog').locator('input[required]').first().fill(name)
    await page.getByRole('button', { name: /create project/i }).click()
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 15_000 })
    await page.goto(APP_BASE + '/projects')
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 })
  })

  test('anonymous /projects redirects to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/projects')
    await page.waitForURL(/\/login|\/$/, { timeout: 10_000 })
    expect(page.url()).toMatch(/\/login|\/$/)
  })
})
