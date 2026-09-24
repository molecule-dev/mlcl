/**
 * /projects/:projectId/board — kanban board. Verifies:
 * - the board loads with the expected 4 columns + counts
 * - "Add Task" modal creates a real task in the right column AND survives reload
 * - dragging a card from To-Do to Done writes status='done' to the DB
 *   (read-after-write via the next GET) and persists across page reload
 * - the "delete" affordance on a card actually deletes the row server-side
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedProject,
  seedTask,
  signup,
  uniqueEmail,
} from './_helpers.js'

const apiBase = () => `http://localhost:${process.env.API_PORT || '4020'}/api`

test.describe('board page', () => {
  test('renders four columns with correct labels and counts for a fresh project, and fetches /api/projects/:id + /api/tasks on mount', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('board-empty'))
    const project = await seedProject(page, accessToken, { name: 'Empty Board Project' })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + `/projects/${project.id}/board`)
      await expect(page.getByTestId('board-page')).toBeVisible()
      for (const status of ['todo', 'in_progress', 'in_review', 'done'] as const) {
        await expect(page.getByTestId(`board-column-${status}`)).toBeVisible()
        await expect(page.getByTestId(`board-column-count-${status}`)).toContainText('0')
        await expect(page.getByTestId(`board-column-empty-${status}`)).toBeVisible()
      }
    })
    expect(reqs.some((r) => r.url.includes(`/api/projects/${project.id}`))).toBeTruthy()
    expect(reqs.some((r) => r.url.includes('/api/tasks'))).toBeTruthy()
  })

  test('Add Task modal creates a real task that GET /api/tasks returns afterwards', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('board-add-task'))
    const project = await seedProject(page, accessToken, { name: 'AddTask Proj' })
    await page.goto(APP_BASE + `/projects/${project.id}/board`)

    await page.getByTestId('board-add-task-todo').click()
    await expect(page.getByTestId('board-add-task-modal')).toBeVisible()
    const taskTitle = `Wire feature ${Date.now()}`
    await page.getByTestId('board-new-task-title').fill(taskTitle)
    await page.getByTestId('board-new-task-priority').selectOption('high')
    await page.getByTestId('board-new-task-submit').click()

    await expect(page.getByTestId('board-add-task-modal')).not.toBeVisible({ timeout: 8000 })
    await expect(page.getByTestId('board-column-todo')).toContainText(taskTitle)

    // Read-after-write: backend list contains the task with the chosen priority.
    const tasksRes = await page.request.get(`${apiBase()}/tasks?project_id=${project.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(tasksRes.status()).toBe(200)
    const tasks = (await tasksRes.json()) as { title: string; priority: string; status: string }[]
    const created = tasks.find((t) => t.title === taskTitle)
    expect(created, 'created task in list').toBeTruthy()
    expect(created!.priority).toBe('high')
    expect(created!.status).toBe('todo')

    // Reload-persist
    await page.reload()
    await expect(page.getByTestId('board-column-todo')).toContainText(taskTitle)
  })

  test('drag-drop a card from To-Do to Done writes status=done in the DB and survives reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('board-drag'))
    const project = await seedProject(page, accessToken, { name: 'Drag Proj' })
    const task = await seedTask(page, accessToken, {
      title: 'Carry me to Done',
      project_id: project.id,
      status: 'todo',
    })
    await page.goto(APP_BASE + `/projects/${project.id}/board`)
    const card = page.locator(`[data-task-id="${task.id}"]`)
    await expect(card).toBeVisible()
    await expect(card).toHaveAttribute('data-task-status', 'todo')

    // HTML5 DnD via dragTo is flaky with React's synthetic events because
    // setState() in onDragStart hasn't committed by the time onDrop fires
    // synchronously in the same JS task. Split the dispatch across micro-tasks
    // (separate page.evaluate calls + microtask awaits) so React commits the
    // `dragging` state between dragstart and drop.
    await page.evaluate((taskId) => {
      const cardEl = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement
      const dt = new DataTransfer()
      ;(window as unknown as { __dndDt?: DataTransfer }).__dndDt = dt
      cardEl.dispatchEvent(
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
    }, task.id)
    // Yield to React so the dragging state from setDragging() actually commits.
    await page.waitForTimeout(50)
    await page.evaluate(() => {
      const drop = document.querySelector('[data-testid="board-dropzone-done"]') as HTMLElement
      const dt = (window as unknown as { __dndDt: DataTransfer }).__dndDt
      drop.dispatchEvent(
        new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
      drop.dispatchEvent(
        new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }),
      )
    })
    await page.waitForTimeout(600)

    // Read-after-write: GET /api/tasks/:id returns status='done'
    const fresh = await page.request.get(`${apiBase()}/tasks/${task.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(fresh.status()).toBe(200)
    const body = (await fresh.json()) as { status: string }
    expect(body.status, 'task status after drop should be done').toBe('done')

    // Reload-persist: the card now lives in the Done column, not To-Do.
    await page.reload()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveAttribute(
      'data-task-status',
      'done',
    )
    await expect(page.getByTestId('board-column-done')).toContainText('Carry me to Done')
  })

  test('deleting a card actually removes the task row from the DB', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('board-del'))
    const project = await seedProject(page, accessToken, { name: 'Del Proj' })
    const task = await seedTask(page, accessToken, {
      title: 'Doomed task',
      project_id: project.id,
    })
    await page.goto(APP_BASE + `/projects/${project.id}/board`)
    // Two-step inline confirm (shared ConfirmButton): arm, assert the confirm
    // label, then commit — no native dialog fires any more.
    const deleteBtn = page.locator(`[data-task-id="${task.id}"] [data-mol-id="board-task-delete"]`)
    await deleteBtn.click()
    const armed = page.locator(
      `[data-task-id="${task.id}"] [data-mol-id="board-task-delete"][data-state="armed"]`,
    )
    await expect(armed).toBeVisible()
    await expect(armed).toContainText('Delete this task?')
    await armed.click()
    await page.waitForTimeout(500)

    const after = await page.request.get(`${apiBase()}/tasks/${task.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(after.status(), 'GET deleted task').toBe(404)

    await page.reload()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveCount(0)
  })

  test('Toggle done from card footer updates DB and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('board-toggle'))
    const project = await seedProject(page, accessToken, { name: 'Toggle Proj' })
    const task = await seedTask(page, accessToken, {
      title: 'Toggle me',
      project_id: project.id,
      status: 'todo',
    })
    await page.goto(APP_BASE + `/projects/${project.id}/board`)
    await page.locator(`[data-task-id="${task.id}"] [data-testid="board-task-toggle"]`).click()
    await page.waitForTimeout(400)
    const fresh = await page.request.get(`${apiBase()}/tasks/${task.id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await fresh.json()) as { status: string }
    expect(body.status).toBe('done')

    await page.reload()
    await expect(page.locator(`[data-task-id="${task.id}"]`)).toHaveAttribute(
      'data-task-status',
      'done',
    )
  })
})
