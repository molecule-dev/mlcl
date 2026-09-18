import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, createProject, signup } from './_helpers.js'

test.describe('/projects/:id (Editor)', () => {
  test('renders the project name as h1', async ({ page }) => {
    await signup(page)
    const id = await createProject(page, 'Editor Spec Project')
    await page.goto(APP_BASE + `/projects/${id}`)
    await expect(
      page.getByRole('heading', { name: /Editor Spec Project/i, level: 1 }),
    ).toBeVisible()
  })

  test('select-tool button (mouse) is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    const btn = page.locator('[data-mol-id="tool-select"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('transform-tool button is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    const btn = page.locator('[data-mol-id="tool-transform"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('pen-tool (edit) button is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    const btn = page.locator('[data-mol-id="tool-pen"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('text-tool button is clickable', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    const btn = page.locator('[data-mol-id="tool-text"]')
    await btn.click()
    await expect(btn).toHaveClass(/border-\[color-mix\(in_srgb,var\(--anim-primary\)/)
  })

  test('Add layer click POSTs /api/layers and the new row appears in the list AND in GET /api/layers', async ({
    page,
  }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    await expect(page.getByRole('button', { name: /Add layer/i })).toBeVisible()

    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const before = await page.request.get(`${API_BASE}/layers?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const beforeArr = await before.json()
    const beforeCount = Array.isArray(beforeArr) ? beforeArr.length : 0

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Add layer/i }).click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => /\/api\/layers(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/layers fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    const after = await page.request.get(`${API_BASE}/layers?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const afterArr = await after.json()
    expect(afterArr.length, 'layers count must increase by 1').toBe(beforeCount + 1)
  })

  test('Export link navigates to /projects/:id/export', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}`)
    await page.getByRole('link', { name: /Export/i }).click()
    await expect(page).toHaveURL(new RegExp(`/projects/${id}/export`))
  })
})
