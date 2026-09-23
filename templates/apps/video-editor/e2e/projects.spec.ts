import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup, signupWithProject } from './_helpers.js'

test.describe('projects', () => {
  test('create new project via UI persists in API and navigates to editor', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/projects/new')
    await page.locator('input[name="name"]').fill('UI-Created Cut')
    await page.locator('[data-mol-id="preset-vertical-9-16"]').click()
    await page.locator('[data-mol-id="new-project-submit"]').click()
    await expect(page).toHaveURL(/\/editor\/[0-9a-f-]{8,}/, { timeout: 15_000 })
    const list = await api<
      Array<{ id: string; name: string; width: number; height: number; fps: number }>
    >(page, 'GET', '/projects')
    const created = list.find((p) => p.name === 'UI-Created Cut')
    expect(created, 'project visible in /api/projects').toBeTruthy()
    expect(created!.width).toBe(1080)
    expect(created!.height).toBe(1920)
  })

  test('project detail loads real data and supports rename', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Rename Me')
    await page.goto(APP_BASE + '/projects/' + project.id)
    await expect(page.locator('[data-mol-id="project-name"]')).toContainText('Rename Me', {
      timeout: 10_000,
    })
    await page.locator('[data-mol-id="project-name-edit"]').click()
    await page.locator('[data-mol-id="project-name-input"]').fill('Renamed')
    await page.locator('[data-mol-id="project-name-save"]').click()
    await expect(page.locator('[data-mol-id="project-name"]')).toContainText('Renamed', {
      timeout: 10_000,
    })
    const fresh = await api<{ name: string }>(page, 'GET', `/projects/${project.id}`)
    expect(fresh.name).toBe('Renamed')
  })

  test('project detail "Queue render" creates an export and opens detail', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Render Project')
    await page.goto(APP_BASE + '/projects/' + project.id)
    await page.locator('[data-mol-id="project-export"]').click()
    await expect(page).toHaveURL(/\/export\/[0-9a-f-]{8,}/, { timeout: 15_000 })
    const exports = await api<Array<{ project_id: string }>>(
      page,
      'GET',
      `/exports?projectId=${project.id}`,
    )
    expect(exports.length).toBeGreaterThanOrEqual(1)
  })

  test('project delete returns to dashboard and project disappears', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Delete Me')
    await page.goto(APP_BASE + '/projects/' + project.id)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-mol-id="project-delete"]').click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })
    const list = await api<Array<{ id: string }>>(page, 'GET', '/projects')
    expect(list.find((p) => p.id === project.id)).toBeUndefined()
  })

  test('unknown project id renders error gracefully', async ({ page }) => {
    // Unknown project 404s — the page renders its error state; the browser's
    // 404 console line is expected noise.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/projects/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="project-error"]')).toBeVisible({ timeout: 10_000 })
  })
})
