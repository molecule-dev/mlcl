import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/settings: workspace preferences', () => {
  test('Settings heading is visible after signup', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /^settings$/i }).first()).toBeVisible()
  })

  test('toggling AI assist persists across reload (localStorage round-trip)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Find the AI-assist toggle by its label region.
    const aiToggle = page.locator('button[role="switch"]').first()
    await expect(aiToggle).toBeVisible({ timeout: 10_000 })
    const beforeState = await aiToggle.getAttribute('aria-checked')
    await aiToggle.click()
    await page.waitForTimeout(200)
    const afterState = await aiToggle.getAttribute('aria-checked')
    expect(afterState).not.toBe(beforeState)
    await page.reload()
    const reloaded = page.locator('button[role="switch"]').first()
    await expect(reloaded).toBeVisible({ timeout: 10_000 })
    const persisted = await reloaded.getAttribute('aria-checked')
    expect(persisted).toBe(afterState)
  })

  test('all four integrations are listed in the Integrations section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /github/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /figma/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /contentful/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /slack/i })).toBeVisible()
  })

  test('default language pairs section heading renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /default language pairs/i })).toBeVisible()
  })
})
