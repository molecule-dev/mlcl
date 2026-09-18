import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, api, signup } from './_helpers.js'

test.describe('asset library', () => {
  test('empty asset library shows empty state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    await expect(page.locator('[data-mol-id="assets-empty"]')).toBeVisible({ timeout: 10_000 })
  })

  test('add asset via UI form persists and renders in grid', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/assets')
    await page.locator('[data-mol-id="assets-upload"]').click()
    await page.locator('[data-mol-id="asset-form-name"]').fill('cinema-loop.mp4')
    await page.locator('[data-mol-id="asset-form-kind"]').selectOption('video')
    await page
      .locator('[data-mol-id="asset-form-url"]')
      .fill('https://cdn.example.com/cinema-loop.mp4')
    await page.locator('[data-mol-id="asset-form-submit"]').click()
    await expect(page.locator('[data-mol-id="assets-grid"]')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('cinema-loop.mp4')).toBeVisible()
    const list = await api<Array<{ name: string }>>(page, 'GET', '/assets')
    expect(list.some((a) => a.name === 'cinema-loop.mp4')).toBe(true)
  })

  test('asset detail loads real asset data and shows source url', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/assets', {
      name: 'detail-asset.mp4',
      kind: 'video',
      source_url: 'https://cdn.example.com/detail-asset.mp4',
    })
    await page.goto(APP_BASE + '/assets/' + created.id)
    await expect(page.locator('[data-mol-id="asset-name"]')).toContainText('detail-asset.mp4', {
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="asset-source-url"]')).toContainText(
      'https://cdn.example.com/detail-asset.mp4',
    )
  })

  test('asset delete removes from list and returns to /assets', async ({ page }) => {
    await signup(page)
    const created = await api<{ id: string }>(page, 'POST', '/assets', {
      name: 'gone-asset.mp4',
      kind: 'video',
      source_url: 'https://cdn.example.com/gone.mp4',
    })
    await page.goto(APP_BASE + '/assets/' + created.id)
    page.once('dialog', (d) => d.accept())
    await page.locator('[data-mol-id="asset-delete"]').click()
    await expect(page).toHaveURL(/\/assets$/, { timeout: 10_000 })
    const list = await api<Array<{ id: string }>>(page, 'GET', '/assets')
    expect(list.find((a) => a.id === created.id)).toBeUndefined()
  })

  test('filter chips narrow the visible list', async ({ page }) => {
    await signup(page)
    await api(page, 'POST', '/assets', {
      name: 'v.mp4',
      kind: 'video',
      source_url: 'https://example.com/v.mp4',
    })
    await api(page, 'POST', '/assets', {
      name: 'song.mp3',
      kind: 'audio',
      source_url: 'https://example.com/song.mp3',
    })
    await page.goto(APP_BASE + '/assets')
    await expect(page.locator('[data-mol-id="assets-grid"]')).toBeVisible({ timeout: 10_000 })
    await page.locator('[data-mol-id="assets-filter-audio"]').click()
    await expect(page.getByText('song.mp3')).toBeVisible()
    await expect(page.getByText('v.mp4')).not.toBeVisible()
  })
})
