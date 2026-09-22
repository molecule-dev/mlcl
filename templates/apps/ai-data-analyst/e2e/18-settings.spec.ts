import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, gotoWithResponse, signup } from './_helpers'

// /settings — four sections (account, integrations, api_keys, team).
// Hash drives section. Account form persists via PATCH /api/profile/me.
// Integrations toggle hits PUT /api/settings/integrations/:source.
// API keys CRUD hits /api/api_keys.

test.describe('/settings', () => {
  test('account section loads /api/profile/me + /api/settings + /api/api_keys', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      // Wait for all three to settle so none can race past the listener
      await Promise.all([
        page
          .waitForResponse(
            (r) => /\/api\/profile\/me/.test(r.url()) && r.request().method() === 'GET',
            { timeout: 15_000 },
          )
          .catch(() => null),
        page
          .waitForResponse(
            (r) => /\/api\/settings(\?|$|\b)/.test(r.url()) && r.request().method() === 'GET',
            { timeout: 15_000 },
          )
          .catch(() => null),
        page
          .waitForResponse(
            (r) => /\/api\/api_keys/.test(r.url()) && r.request().method() === 'GET',
            { timeout: 15_000 },
          )
          .catch(() => null),
      ])
      // Settle any extra renders/responses
      await page.waitForLoadState('networkidle').catch(() => null)
    })
    expect(
      reqs.find((r) => /\/api\/profile\/me/.test(r.url) && r.method === 'GET'),
      'GET /api/profile/me',
    ).toBeDefined()
    expect(
      reqs.find((r) => /\/api\/settings/.test(r.url) && r.method === 'GET'),
      'GET /api/settings',
    ).toBeDefined()
  })

  test('saving account fields PATCHes /api/profile/me and persists on reload', async ({ page }) => {
    await signup(page)
    await gotoWithResponse(page, '/settings', /\/api\/profile\/me/)
    await page.locator('[data-mol-id="settings-display-name"]').fill('Walked Through')
    await page.locator('[data-mol-id="settings-organization"]').fill('WalkthruCorp')
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/profile\/me/.test(r.url()) && r.request().method() === 'PATCH',
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-save-account"]').click()
      await respPromise
    })
    const patch = reqs.find((r) => r.method === 'PATCH' && /\/api\/profile\/me/.test(r.url))
    expect(patch).toBeDefined()
    expect(patch!.status).toBe(200)
    // Reload and verify persistence — arm the GET wait BEFORE reload (the
    // initial-load fetch can complete before a post-reload wait would arm),
    // then poll (React strict mode can fire useEffect twice; tolerate that.)
    const reloadGet = page.waitForResponse(
      (r) => /\/api\/profile\/me/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.reload()
    await reloadGet
    await page.waitForLoadState('networkidle').catch(() => null)
    await expect(page.locator('[data-mol-id="settings-display-name"]')).toHaveValue(
      'Walked Through',
      { timeout: 15_000 },
    )
    await expect(page.locator('[data-mol-id="settings-organization"]')).toHaveValue(
      'WalkthruCorp',
      { timeout: 15_000 },
    )
  })

  test('integrations: toggling Snowflake PUTs /api/settings/integrations/snowflake', async ({
    page,
  }) => {
    await signup(page)
    await gotoWithResponse(page, '/settings#integrations', /\/api\/settings(\?|$|\b)/)
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) =>
          /\/api\/settings\/integrations\/snowflake/.test(r.url()) &&
          r.request().method() === 'PUT',
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-integration-snowflake-toggle"]').click()
      await respPromise
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/integrations\/snowflake/.test(r.url))
    expect(put).toBeDefined()
    expect(put!.status).toBe(200)
  })

  test('API keys: create POSTs /api/api_keys and shows plaintext once', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings#api_keys')
    await page.locator('[data-mol-id="settings-apikey-name"]').fill('CI bot')
    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) => /\/api\/api_keys$/.test(r.url()) && r.request().method() === 'POST',
        { timeout: 10_000 },
      )
      await page.locator('[data-mol-id="settings-apikey-create"]').click()
      await respPromise
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/api_keys$/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status).toBe(201)
    await expect(page.locator('[data-mol-id="settings-apikey-plaintext"]')).toContainText(/clrn_/)
  })

  test('display name field accepts typed input', async ({ page }) => {
    await signup(page)
    await gotoWithResponse(page, '/settings', /\/api\/profile\/me/)
    // Wait for React Strict-Mode double-load to settle so async fetch can't clobber typed value.
    await expect(page.locator('[data-mol-id="settings-display-name"]')).not.toHaveValue('', {
      timeout: 10_000,
    })
    await page.waitForLoadState('networkidle')
    const dn = page.locator('[data-mol-id="settings-display-name"]')
    await dn.fill('Walked Through')
    await expect(dn).toHaveValue('Walked Through')
  })

  test('organization field accepts typed input', async ({ page }) => {
    await signup(page)
    await gotoWithResponse(page, '/settings', /\/api\/profile\/me/)
    // displayName is the load-settled proxy (org is empty for a fresh user).
    await expect(page.locator('[data-mol-id="settings-display-name"]')).not.toHaveValue('', {
      timeout: 10_000,
    })
    await page.waitForLoadState('networkidle')
    const org = page.locator('[data-mol-id="settings-organization"]')
    await org.fill('WalkthruCorp')
    await expect(org).toHaveValue('WalkthruCorp')
  })

  test('API key name field accepts typed input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings#api_keys')
    const name = page.locator('[data-mol-id="settings-apikey-name"]')
    await name.fill('CI bot')
    await expect(name).toHaveValue('CI bot')
  })
})
