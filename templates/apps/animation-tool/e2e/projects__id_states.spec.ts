import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, createProject, signup } from './_helpers.js'

test.describe('/projects/:id/states (StateMachine)', () => {
  test('renders the State machine heading', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/states`)
    await expect(page.getByRole('heading', { name: /State machine/i, level: 1 })).toBeVisible()
  })

  test('timeline view button is clickable and toggles view', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/states`)
    const btn = page.locator('[data-mol-id="view-timeline"]')
    await btn.click()
    await expect(btn).toHaveClass(/from-\[var\(--anim-primary\)\]/)
  })

  test('states view button is clickable and toggles view', async ({ page }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/states`)
    const btn = page.locator('[data-mol-id="view-states"]')
    await btn.click()
    await expect(btn).toHaveClass(/from-\[var\(--anim-primary\)\]/)
  })

  test('Add state click POSTs /api/states; first state is initial; row appears in next GET', async ({
    page,
  }) => {
    await signup(page)
    const id = await createProject(page)
    await page.goto(APP_BASE + `/projects/${id}/states`)

    const cookies = await page.context().cookies()
    const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Add state/i }).click()
      await page.waitForTimeout(2_000)
    })
    const post = reqs.find((r) => /\/api\/states(?:\?|$)/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/states fired').toBeTruthy()
    expect(post!.status).toBeLessThan(300)

    // Invariant: the new state shows up via GET, AND it is marked initial
    // (it's the first state on a brand-new project).
    const after = await page.request.get(`${API_BASE}/states?projectId=${id}`, {
      headers: { Cookie: cookieStr },
    })
    const arr = await after.json()
    expect(Array.isArray(arr)).toBe(true)
    expect(arr.length, 'one state must persist').toBeGreaterThanOrEqual(1)
    const initial = arr.find((s: { is_initial?: boolean }) => s.is_initial === true)
    expect(initial, 'first state must be marked is_initial=true').toBeTruthy()
  })
})
