/**
 * /dashboard — primary landing after login. Verifies:
 * - greeting renders with the signed-up user's name
 * - "New Project" modal creates a project, redirects to its board, AND
 *   the project shows up in the next GET /api/projects (read-after-write)
 * - empty state appears for a fresh user with zero projects/tasks
 * - sidebar nav links route to the right top-level pages
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('dashboard page', () => {
  test('fresh user sees empty-state CTAs (no projects, no tasks) and the page calls /api/profile/me + /api/projects', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page, uniqueEmail('dash-empty'))
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByTestId('dashboard-projects-empty')).toBeVisible()
      await expect(page.getByTestId('dashboard-tasks-empty')).toBeVisible()
      await expect(page.getByTestId('kpi-projects')).toBeVisible()
    })
    expect(reqs.some((r) => r.url.includes('/api/profile/me'))).toBeTruthy()
    expect(reqs.some((r) => r.url.includes('/api/projects'))).toBeTruthy()
  })

  test('greeting shows the signed-up user name in the header tile', async ({ page }) => {
    await signup(page, uniqueEmail('dash-greet'), 'TestPass!1234', 'Greeted Greg')
    const greetingText = await page.getByTestId('dashboard-greeting').innerText()
    expect(greetingText).toContain('Greeted Greg')
    const planLabel = await page.getByTestId('dashboard-plan-label').innerText()
    expect(planLabel.toLowerCase()).toMatch(/free/)
  })

  test('New Project modal creates a project, navigates to /board, and survives reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('dash-new-proj'))
    const projName = `Dash Proj ${Date.now()}`
    await page.getByTestId('dashboard-new-project').click()
    await expect(page.getByTestId('new-project-modal')).toBeVisible()
    await page.getByTestId('new-project-name').fill(projName)
    await page.getByTestId('new-project-description').fill('Created from dashboard test')
    await page.getByTestId('new-project-submit').click()
    await page.waitForURL(/\/projects\/[0-9a-f-]+\/board/, { timeout: 10000 })
    await expect(page.getByTestId('board-page')).toBeVisible()
    await expect(page.getByTestId('board-project-name')).toContainText(projName)

    // Read-after-write: the next GET /api/projects must include this project.
    const list = await page.request.get(
      `${APP_BASE.replace(/:\d+$/, ':' + (process.env.API_PORT || '4020'))}/api/projects`,
      {
        headers: apiHeaders(accessToken),
      },
    )
    expect(list.status(), 'GET /api/projects after create').toBe(200)
    const items = (await list.json()) as { name: string }[]
    expect(
      items.some((i) => i.name === projName),
      `created project ${projName} appears in list`,
    ).toBe(true)

    // Reload-persist: navigate back to /dashboard via reload, project still in projects panel.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByTestId('dashboard-projects')).toContainText(projName)
  })

  test('toggling a task on the dashboard persists status to the backend', async ({ page }) => {
    const apiBase = `http://localhost:${process.env.API_PORT || '4020'}/api`
    const { accessToken } = await signup(page, uniqueEmail('dash-toggle'))
    const projRes = await page.request.post(`${apiBase}/projects`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Toggle Proj', color: '#5b67d8' },
    })
    expect(projRes.status()).toBe(201)
    const project = (await projRes.json()) as { id: string }
    const taskRes = await page.request.post(`${apiBase}/tasks`, {
      headers: apiHeaders(accessToken),
      data: { title: 'Pick up groceries', project_id: project.id, status: 'todo' },
    })
    expect(taskRes.status()).toBe(201)
    const task = (await taskRes.json()) as { id: string }

    await page.goto(APP_BASE + '/dashboard')
    const row = page.getByTestId('dashboard-task-row').first()
    await expect(row).toHaveAttribute('data-task-id', task.id)
    await expect(row).toHaveAttribute('data-task-status', 'todo')
    await page.getByTestId('dashboard-task-toggle').first().click()
    await page.waitForTimeout(400) // allow the PATCH round-trip

    // Read-after-write: GET task by id reflects the new status.
    const fresh = await page.request.get(`${apiBase}/tasks/${task.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(fresh.status()).toBe(200)
    const body = (await fresh.json()) as { status: string }
    expect(body.status).toBe('done')

    // After reload, dashboard still reflects the persisted status.
    await page.reload()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveAttribute(
      'data-task-status',
      'done',
    )
  })

  test('navigating from sidebar to /settings, /my-tasks, /calendar reaches each page', async ({
    page,
  }) => {
    await signup(page, uniqueEmail('dash-nav'))
    await page
      .getByRole('link', { name: /settings/i })
      .first()
      .click()
    await page.waitForURL('**/settings')
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /my tasks/i })
      .first()
      .click()
    await page.waitForURL(/\/my-tasks/)
    await page.goto(APP_BASE + '/dashboard')
    await page
      .getByRole('link', { name: /calendar/i })
      .first()
      .click()
    await page.waitForURL(/\/calendar/)
  })
})
