import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup, signupWithProject } from './_helpers.js'

test.describe('exports', () => {
  test('empty queue shows empty state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/export')
    await expect(page.locator('[data-mol-id="exports-empty"]')).toBeVisible({ timeout: 10_000 })
  })

  test('queue render via UI form persists and shows in table', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Queue UI Project')
    await page.goto(APP_BASE + '/export')
    await page.locator('[data-mol-id="export-form-project"]').selectOption(project.id)
    await page.locator('[data-mol-id="export-form-format"]').selectOption('webm')
    await page.locator('[data-mol-id="export-form-resolution"]').selectOption('720p')
    await page.locator('[data-mol-id="export-form-submit"]').click()
    await expect(page.locator('[data-mol-id="exports-table"]')).toBeVisible({ timeout: 10_000 })
    const rows = await api<Array<{ project_id: string; format: string }>>(page, 'GET', '/exports')
    expect(
      rows.some((e) => e.project_id === project.id && e.format === 'webm'),
      'export persisted',
    ).toBe(true)
  })

  test('export detail loads with progress and copy button', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Detail Project')
    const exp = await api<{ id: string }>(page, 'POST', '/exports', {
      project_id: project.id,
      format: 'mp4',
      resolution: '1080p',
    })
    await page.goto(APP_BASE + '/export/' + exp.id)
    await expect(page.locator('[data-mol-id="export-filename"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="export-progress"]')).toContainText('100')
    await expect(page.locator('[data-mol-id="export-copy"]')).toBeVisible()
  })

  test('unknown export id renders error gracefully', async ({ page }) => {
    // Unknown export 404s — the page renders its error state; the browser's
    // 404 console line is expected noise.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signup(page)
    await page.goto(APP_BASE + '/export/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="export-error"]')).toBeVisible({ timeout: 10_000 })
  })
})
