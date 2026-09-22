import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Settings page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders provider keys table + workspace defaults + danger zone', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-mol-id="page-settings"]')).toBeVisible()
    for (const provider of ['anthropic', 'openai', 'google'] as const) {
      await expect(page.locator(`[data-mol-id="settings-credential-${provider}"]`)).toBeVisible()
    }
    await expect(page.locator('[data-mol-id="settings-default-provider"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-default-model"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-timezone"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-purge"]')).toBeVisible()
  })

  test('changing default provider PATCHes /api/user-preferences (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    const select = page.locator('[data-mol-id="settings-default-provider"]')
    const reqs = await captureNetwork(page, async () => {
      await select.selectOption('openai')
      await expect(page.locator('[data-mol-id="settings-info"]')).toBeVisible({ timeout: 5000 })
    })
    const patches = whereUrl(reqs, /\/api\/user-preferences/, 'PATCH')
    expect(patches.length, 'PATCH /api/user-preferences should fire').toBeGreaterThan(0)
    expect(patches[0].status).toBeLessThan(300)

    const after = await authedApi(request, session.accessToken!).get('/user-preferences')
    expect(after.status()).toBe(200)
    const body = await after.json()
    expect(body?.data?.defaultProvider).toBe('openai')
  })

  test('saving an API key flips the badge to "active" (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Inline key editor (replaced the old window.prompt flow): Add → type → Save.
    await page.locator('[data-mol-id="settings-credential-openai-rotate"]').click()
    await page
      .locator('[data-mol-id="settings-credential-openai-key-input"]')
      .fill('sk-test-key-AAAAA')
    await page.locator('[data-mol-id="settings-credential-openai-key-save"]').click()
    await expect(page.locator('[data-mol-id="settings-info"]')).toBeVisible({ timeout: 5000 })

    const list = await authedApi(request, session.accessToken!).get('/api-credentials')
    expect(list.status()).toBe(200)
    const rows = (await list.json()) as Array<{ provider: string; hasKey: boolean }>
    const openai = rows.find((r) => r.provider === 'openai')
    expect(openai, 'openai credential row should exist').toBeTruthy()
    expect(openai!.hasKey).toBeTruthy()

    await expect(
      page.locator('[data-mol-id="settings-credential-openai"]').getByText(/active/i),
    ).toBeVisible()
  })

  test('"Purge Workspace" requires explicit confirmation', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-purge"]').click()
    await expect(page.locator('[data-mol-id="settings-purge-confirm"]')).toBeVisible()
    await page.locator('[data-mol-id="settings-purge-confirm-cancel"]').click()
    await expect(page.locator('[data-mol-id="settings-purge"]')).toBeVisible()
  })

  test('purge actually deletes the user\u2019s agents (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = authedApi(request, session.accessToken!)
    await api.post('/agents', {
      name: 'Will be purged',
      provider: 'anthropic',
      model: 'claude-haiku-4-5',
    })
    const before = await api.get('/agents')
    expect(((await before.json()) as unknown[]).length).toBeGreaterThan(0)

    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-mol-id="settings-purge"]').click()
    await page.locator('[data-mol-id="settings-purge-confirm-yes"]').click()
    await expect(page.locator('[data-mol-id="settings-info"]')).toBeVisible({ timeout: 10000 })

    const after = await api.get('/agents')
    expect((await after.json()) as unknown[]).toEqual([])
  })
})
