import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
  })

  test('GET /api/profile/me fires on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const get = reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET')
    expect(get, 'GET /api/profile/me should fire on /settings').toBeTruthy()
    expect(get!.status).toBeLessThan(300)
  })

  test('Account tab is the default and shows the Account heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Account$/i, level: 2 })).toBeVisible()
  })

  test('Study tab swaps in the Study preferences pane', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Study$/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: /Study preferences/i, level: 2 })).toBeVisible()
  })

  test('Reminders tab reveals the reminder toggles', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Reminders$/i })
      .first()
      .click()
    await expect(page.getByRole('heading', { name: /^Reminders$/i, level: 2 })).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-reminder-daily"]')).toBeVisible()
  })

  test('Display name PATCHes /api/profile/me and value persists across reload', async ({
    page,
  }) => {
    const newName = 'Persisted Name ' + Date.now()
    const input = page.locator('[data-mol-id="settings-name"]')
    await input.fill(newName)
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-save-account"]').click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    })
    const patch = reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/profile/me should fire on Save').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-name"]')).toHaveValue(newName)
  })

  test('Theme button "Dark" PATCHes theme and aria-pressed flips', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-theme-dark"]').click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    })
    const patch = reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/profile/me should fire on theme switch').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="settings-theme-dark"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Persists across reload
    await page.reload()
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="settings-theme-dark"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  test('Daily review goal PATCHes and persists across reload', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Study$/i })
      .first()
      .click()
    const goal = page.locator('[data-mol-id="settings-daily-goal"]')
    await goal.fill('42')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="settings-save-study"]').click()
      await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    })
    const patch = reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'PATCH')
    expect(patch, 'PATCH /api/profile/me should fire on Study Save').toBeTruthy()
    expect(patch!.status).toBeLessThan(300)
    await page.reload()
    await page
      .getByRole('button', { name: /^Study$/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="settings-daily-goal"]')).toHaveValue('42')
  })

  test('reminder daily toggle persists across reload (localStorage)', async ({ page }) => {
    await page
      .getByRole('button', { name: /^Reminders$/i })
      .first()
      .click()
    const cb = page.locator('[data-mol-id="settings-reminder-daily"]')
    // Default checked. Uncheck.
    await cb.uncheck()
    await expect(cb).not.toBeChecked()
    await page.reload()
    await page
      .getByRole('button', { name: /^Reminders$/i })
      .first()
      .click()
    await expect(page.locator('[data-mol-id="settings-reminder-daily"]')).not.toBeChecked()
  })

  test('Account tab shows the Display name input (default tab)', async ({ page }) => {
    await expect(page.locator('[data-mol-id="settings-name"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-email"]')).toBeVisible()
  })
})
