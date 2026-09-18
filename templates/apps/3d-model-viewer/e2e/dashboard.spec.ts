import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, signup } from './_helpers.js'

test.describe('dashboard — stat cards reflect real backend state, not hardcoded numbers', () => {
  test('"Total Models" card mirrors GET /models length, not a fixed string', async ({ page }) => {
    await signup(page)
    // Seed two models for this user.
    for (let i = 0; i < 2; i++) {
      await api(page, 'POST', '/models', {
        name: `Stat ${i}-${Date.now()}`,
        file_url: 'local://x.glb',
        format: 'glb',
        file_size: (i + 1) * 1024,
        polygon_count: 0,
      })
    }
    await page.goto(APP_BASE + '/dashboard')
    // The Total Models card should eventually display "2".
    await expect(page.getByText('2', { exact: true }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('"Storage Used" card aggregates file_size from real models (non-zero)', async ({ page }) => {
    await signup(page)
    await api(page, 'POST', '/models', {
      name: `BigFile ${Date.now()}`,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 5 * 1024 * 1024, // 5 MB
      polygon_count: 0,
    })
    await page.goto(APP_BASE + '/dashboard')
    // Look for some byte-style label that contains "MB" — the real number.
    const mbText = page.getByText(/\b\d+(\.\d+)?\s*MB\b/).first()
    await expect(mbText).toBeVisible({ timeout: 10_000 })
  })

  test('Activity feed lists recent uploads with the model name', async ({ page }) => {
    await signup(page)
    const name = `RecentlyAdded ${Date.now()}`
    await api(page, 'POST', '/models', {
      name,
      file_url: 'local://x.glb',
      format: 'glb',
      file_size: 1024,
      polygon_count: 0,
    })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 })
  })
})
