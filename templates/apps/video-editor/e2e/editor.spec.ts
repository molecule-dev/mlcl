import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signupWithProject } from './_helpers.js'

test.describe('editor', () => {
  test('opens project, shows real name + dimensions', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Editor Project')
    await page.goto(APP_BASE + '/editor/' + project.id)
    await expect(page.locator('[data-mol-id="editor-project-name"]')).toContainText(
      'Editor Project',
      { timeout: 10_000 },
    )
    await expect(page.locator('[data-mol-id="editor-project-dims"]')).toContainText('1920×1080')
    await expect(page.locator('[data-mol-id="editor-preview-label"]')).toContainText('1920×1080')
  })

  test('empty asset library shows empty hint', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Empty Editor')
    await page.goto(APP_BASE + '/editor/' + project.id)
    await expect(page.locator('[data-mol-id="editor-assets-empty"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('clicking an asset adds a clip and updates inspector', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Clip Editor')
    const asset = await api<{ id: string }>(page, 'POST', '/assets', {
      name: 'clip-source.mp4',
      kind: 'video',
      source_url: 'https://cdn.example.com/clip-source.mp4',
    })
    await page.goto(APP_BASE + '/editor/' + project.id)
    await expect(page.locator(`[data-mol-id="editor-asset-${asset.id}"]`)).toBeVisible({
      timeout: 10_000,
    })
    await page.locator(`[data-mol-id="editor-asset-${asset.id}"]`).click()
    await expect(page.locator('[data-mol-id="editor-clips"] li').first()).toBeVisible({
      timeout: 10_000,
    })
    const clips = await api<Array<{ project_id: string }>>(
      page,
      'GET',
      `/clips?projectId=${project.id}`,
    )
    expect(
      clips.some((c) => c.project_id === project.id),
      'clip persisted',
    ).toBe(true)
  })

  test('export button creates a render and navigates to export detail', async ({ page }) => {
    const { project } = await signupWithProject(page, 'Editor Export')
    await page.goto(APP_BASE + '/editor/' + project.id)
    await page.locator('[data-mol-id="editor-export"]').click()
    await expect(page).toHaveURL(/\/export\/[0-9a-f-]{8,}/, { timeout: 15_000 })
  })

  test('unknown editor id renders error gracefully', async ({ page }) => {
    // The unknown project id 404s — the page catches it and renders the
    // editor-error state; the browser's 404 console line is expected noise.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 404' })
    await signupWithProject(page, 'Decoy')
    await page.goto(APP_BASE + '/editor/00000000-0000-0000-0000-000000000000')
    await expect(page.locator('[data-mol-id="editor-error"]')).toBeVisible({ timeout: 10_000 })
  })
})
