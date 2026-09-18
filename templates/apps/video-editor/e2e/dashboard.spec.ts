import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

test.describe('dashboard', () => {
  test('empty state encourages first project', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-empty"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="dashboard-empty-create"]')).toBeVisible()
  })

  test('shows real project count and renders project cards', async ({ page }) => {
    await signup(page)
    const project = await api<{ id: string }>(page, 'POST', '/projects', {
      name: 'Dashboard Project',
      width: 1920,
      height: 1080,
      fps: 30,
    })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-projects"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="dashboard-subtitle"]')).toContainText(
      /1 project|1\s*project/i,
    )
    await expect(page.getByText('Dashboard Project').first()).toBeVisible()
    expect(project.id).toBeTruthy()
  })

  test('"new project" button navigates to /projects/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-mol-id="dashboard-new-project"]').click()
    await expect(page).toHaveURL(/\/projects\/new/, { timeout: 5_000 })
  })
})
