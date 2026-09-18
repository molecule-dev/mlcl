import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiGet, captureNetwork, signup } from './_helpers.js'

interface SettingsRow {
  bot_tone: string
  greeting: string
  signature: string
  auto_escalate: boolean
}

interface ApiTokenRow {
  id: string
  label: string
  hashed_token?: string
  plaintext?: string
}

test.describe('/settings', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
  })

  test('settings page fires GET /api/settings on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    })
    const get = reqs.find((r) => /\/api\/settings(?:\?|$)/.test(r.url) && r.method === 'GET')
    expect(get, 'GET /api/settings should fire on load').toBeTruthy()
    expect(get!.status).toBeLessThan(300)
  })

  test('renders the page-settings container', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="page-settings"]')).toBeVisible({ timeout: 10_000 })
  })

  test('Bot tab shows the bot configuration form', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-tab-bot"]').click()
    await expect(page.locator('[data-mol-id="settings-section-bot"]')).toBeVisible()
  })

  test('Integrations tab shows the integrations grid', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-tab-integrations"]').click()
    await expect(page.locator('[data-mol-id="settings-section-integrations"]')).toBeVisible()
  })

  test('API tab shows the token management form', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-tab-api"]').click()
    await expect(page.locator('[data-mol-id="settings-section-api"]')).toBeVisible()
  })

  test('updating bot tone via the form persists to backend', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-bot-tone"]').selectOption('formal')
    await page.locator('[data-mol-id="settings-bot-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    const after = await apiGet<SettingsRow>(page, '/settings')
    expect(after.bot_tone).toBe('formal')
  })

  test('toggling auto-escalate persists to backend', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const cb = page.locator('[data-mol-id="settings-bot-auto-escalate"]')
    const before = await cb.isChecked()
    if (before) await cb.uncheck()
    else await cb.check()
    await page.locator('[data-mol-id="settings-bot-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    const after = await apiGet<SettingsRow>(page, '/settings')
    expect(after.auto_escalate).toBe(!before)
  })

  test('editing the greeting and saving persists to backend', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const newGreeting = 'Hi! Greeting ' + Date.now()
    await page.locator('[data-mol-id="settings-bot-greeting"]').fill(newGreeting)
    await page.locator('[data-mol-id="settings-bot-save"]').click()
    await expect(page.locator('[data-mol-id="settings-saved"]')).toBeVisible({ timeout: 10_000 })
    const after = await apiGet<SettingsRow>(page, '/settings')
    expect(after.greeting).toBe(newGreeting)
  })

  test('creating an API token yields a one-time plaintext value and persists the row', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await page.locator('[data-mol-id="settings-tab-api"]').click()
    const label = 'CI Server ' + Date.now()
    await page.locator('[data-mol-id="settings-api-token-label"]').fill(label)
    await page.locator('[data-mol-id="settings-api-create"]').click()
    await expect(page.locator('[data-mol-id="settings-api-new-token"]')).toBeVisible({
      timeout: 10_000,
    })
    const tokens = await apiGet<ApiTokenRow[]>(page, '/api-tokens')
    expect(tokens.some((t) => t.label === label)).toBe(true)
  })

  test('listing tokens never returns the hash', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    const tokens = await apiGet<ApiTokenRow[]>(page, '/api-tokens')
    for (const t of tokens) {
      expect(t.hashed_token, `token ${t.id} leaked its hash`).toBeUndefined()
    }
  })

  test('Save button on the bot section is wired (button present)', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {})
    await expect(page.locator('[data-mol-id="settings-bot-save"]')).toBeVisible({ timeout: 10_000 })
  })
})
