import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

test.describe('/settings', () => {
  test('renders account, API keys, and integrations sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="settings-page"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-account-section"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-api-section"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="settings-integrations-section"]')).toBeVisible()
  })

  test('saving account name fires PATCH /api/users/:id and persists', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const newName = `Updated ${Date.now()}`
    await page.locator('[data-mol-id="settings-account-name"]').fill(newName)
    let patchUrl = ''
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-account-save"]').click()
      const resp = await respPromise
      expect(resp.status()).toBeLessThan(400)
      patchUrl = resp.url()
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/users\//.test(r.url))
    expect(patch, 'PATCH /api/users/:id should fire').toBeDefined()
    expect(patch!.status).toBeLessThan(400)
    await expect(page.locator('[data-mol-id="settings-account-saved"]')).toBeVisible({
      timeout: 5_000,
    })

    // Read-after-write — re-fetch the same /users/:id and confirm the name persisted.
    const token = await getAccessToken(page)
    const idMatch = patchUrl.match(/\/api\/users\/([^/?#]+)/)
    expect(idMatch, 'patch URL should include user id').toBeTruthy()
    const userId = idMatch![1]
    const me = await page.request.get(API_BASE + `/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(me.ok(), `GET /api/users/${userId} should be 200`).toBe(true)
    const body = (await me.json()) as {
      props?: { name?: string }
      data?: { name?: string }
      name?: string
    }
    const name = body.props?.name ?? body.data?.name ?? body.name
    expect(name).toBe(newName)
  })

  test('generating an API key returns plaintext once and persists in list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const label = `key-${Date.now()}`
    await page.locator('[data-mol-id="settings-api-label"]').fill(label)
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/api\/api-tokens$/.test(r.url()),
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-api-generate"]').click()
      const resp = await respPromise
      expect(resp.status()).toBeLessThan(400)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/api-tokens$/.test(r.url))
    expect(post, 'POST /api/api-tokens should fire').toBeDefined()
    expect(post!.status).toBeLessThan(400)

    // Plaintext secret panel must appear.
    await expect(page.locator('[data-mol-id="settings-api-secret"]')).toBeVisible({
      timeout: 5_000,
    })
    const secretText = await page.locator('[data-mol-id="settings-api-secret"] code').textContent()
    expect(secretText, 'plaintext key must render').toBeTruthy()
    expect(secretText!.length).toBeGreaterThanOrEqual(20)

    // Read-after-write — backend returns the new token entry (no plaintext).
    const token = await getAccessToken(page)
    const list = await page.request.get(API_BASE + '/api-tokens', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = (await list.json()) as Array<{ label: string; prefix: string }>
    expect(
      items.find((tk) => tk.label === label),
      'token must be persisted',
    ).toBeDefined()
  })

  test('connecting an integration sends POST /api/integrations/:provider/connect', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    // Wait for the integrations list to populate before clicking.
    await page
      .locator('[data-mol-id="settings-integration-google-drive-toggle"]')
      .waitFor({ state: 'visible' })
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          /\/api\/integrations\/google-drive\/connect/.test(r.url()),
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-integration-google-drive-toggle"]').click()
      const resp = await respPromise
      expect(resp.status()).toBeLessThan(400)
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && /\/api\/integrations\/google-drive\/connect/.test(r.url),
    )
    expect(post).toBeDefined()
    expect(post!.status).toBeLessThan(400)
  })

  test('Settings page region is visible', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('[data-mol-id="settings-page"]')).toBeVisible()
  })

  test('Account name input accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-mol-id="settings-account-name"]').fill('Robin Lee')
    await expect(page.locator('[data-mol-id="settings-account-name"]')).toHaveValue('Robin Lee')
  })

  test('Account email input accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const newEmail = `robin+${Date.now()}@example.com`
    await page.locator('[data-mol-id="settings-account-email"]').fill(newEmail)
    await expect(page.locator('[data-mol-id="settings-account-email"]')).toHaveValue(newEmail)
  })

  test('API key label input accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    await page.locator('[data-mol-id="settings-api-label"]').fill('CI uploader')
    await expect(page.locator('[data-mol-id="settings-api-label"]')).toHaveValue('CI uploader')
  })

  test('saved name persists across page.reload() (round-trip via local auth cache)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const newName = `Persist ${Date.now()}`
    await page.locator('[data-mol-id="settings-account-name"]').fill(newName)
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-account-save"]').click()
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-account-name"]')).toHaveValue(newName, {
      timeout: 8_000,
    })
  })

  test('disconnecting an integration sends POST /api/integrations/:provider/disconnect', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const toggle = page.locator('[data-mol-id="settings-integration-google-drive-toggle"]')
    await toggle.waitFor({ state: 'visible' })
    // First toggle: connect.
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.request().method() === 'POST' &&
          /\/api\/integrations\/google-drive\/connect/.test(r.url()),
        { timeout: 10_000 },
      ),
      toggle.click(),
    ])
    // Second toggle: disconnect.
    const reqs = await captureNetwork(page, async () => {
      await Promise.all([
        page.waitForResponse(
          (r) =>
            r.request().method() === 'POST' &&
            /\/api\/integrations\/google-drive\/disconnect/.test(r.url()),
          { timeout: 10_000 },
        ),
        toggle.click(),
      ])
    })
    const disconnect = reqs.find(
      (r) => r.method === 'POST' && /\/api\/integrations\/google-drive\/disconnect/.test(r.url),
    )
    expect(disconnect).toBeDefined()
    expect(disconnect!.status).toBeLessThan(400)
  })

  test('revoking an API key removes the row from the list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const label = `revoke-${Date.now()}`
    await page.locator('[data-mol-id="settings-api-label"]').fill(label)
    await Promise.all([
      page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/api\/api-tokens$/.test(r.url()),
        { timeout: 10_000 },
      ),
      page.locator('[data-mol-id="settings-api-generate"]').click(),
    ])
    // Find the freshly-created token row and revoke it.
    const tokenRow = page.locator(`[data-mol-id^="settings-api-token-"]:has-text("${label}")`)
    await expect(tokenRow).toBeVisible({ timeout: 5_000 })
    const revokeBtn = tokenRow.locator('[data-mol-id^="settings-api-revoke-"]')
    const reqs = await captureNetwork(page, async () => {
      await revokeBtn.click()
      await page.waitForTimeout(500)
    })
    const del = reqs.find((r) => r.method === 'DELETE' && /\/api\/api-tokens\//.test(r.url))
    expect(del, 'DELETE /api/api-tokens/:id should fire').toBeDefined()
    await expect(tokenRow).toHaveCount(0, { timeout: 5_000 })
  })
})
