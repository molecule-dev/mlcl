import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Profile page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/profile')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders identity form, default-provider chips, and API token row', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-name-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-email-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-bio-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-provider-anthropic"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-timezone-input"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-api-token"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="profile-save"]')).toBeVisible()
  })

  test('"Save Profile" PATCHes /api/users + /api/user-preferences (read-after-write)', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')

    await page.locator('[data-mol-id="profile-name-input"]').fill('Neuron Operator')
    await page.locator('[data-mol-id="profile-bio-input"]').fill('Loves agent ops.')
    await page.locator('[data-mol-id="profile-timezone-input"]').fill('America/Denver')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-save"]').click()
      await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
    })
    expect(whereUrl(reqs, /\/api\/users\/[\w-]+/, 'PATCH').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/user-preferences/, 'PATCH').length).toBeGreaterThan(0)

    const api = authedApi(request, session.accessToken!)
    const me = await api.get(`/users/${session.userId}`)
    expect(me.status()).toBe(200)
    const meBody = await me.json()
    const user = meBody.props ?? meBody.user ?? meBody
    expect(user.name).toBe('Neuron Operator')

    const prefs = await api.get('/user-preferences')
    expect(prefs.status()).toBe(200)
    const prefsBody = await prefs.json()
    expect(prefsBody?.data?.bio).toBe('Loves agent ops.')
    expect(prefsBody?.data?.timezone).toBe('America/Denver')
  })

  test('selecting a provider chip immediately PATCHes preferences', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="profile-provider-google"]').click()
      await page.waitForTimeout(800)
    })
    expect(whereUrl(reqs, /\/api\/user-preferences/, 'PATCH').length).toBeGreaterThan(0)
    const after = await authedApi(request, session.accessToken!).get('/user-preferences')
    expect((await after.json())?.data?.defaultProvider).toBe('google')
  })

  test('"Regenerate" assigns a new API token (read-after-write)', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    page.once('dialog', (dialog) => void dialog.accept())
    await page.locator('[data-mol-id="profile-token-regenerate"]').click()
    await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
    const prefs = await authedApi(request, session.accessToken!).get('/user-preferences')
    const body = await prefs.json()
    expect(typeof body?.data?.apiToken).toBe('string')
    expect(body.data.apiToken).toMatch(/^neu_live_/)
  })

  test('email field accepts edits and persists to /api/users on save', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    const newEmail = `renamed-${Date.now()}@example.com`
    await page.locator('[data-mol-id="profile-email-input"]').fill(newEmail)
    // The platform user resource re-authenticates email changes (the email is
    // the account-recovery anchor), so the save needs the current password.
    await page.locator('[data-mol-id="profile-current-password"]').fill(session.password)
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
    const me = await authedApi(request, session.accessToken!).get(`/users/${session.userId}`)
    const body = await me.json()
    const user = body.props ?? body.user ?? body
    expect(user.email).toBe(newEmail)
  })

  test('"Copy" affordance for API token enables once a token exists', async ({ page, context }) => {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    } catch {
      // Some browsers (Firefox/WebKit) reject these permission names; safe to skip.
    }
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    // The Copy button is disabled until an apiToken exists. Generate one
    // first via the regenerate affordance, then verify Copy clicks fine.
    page.once('dialog', (d) => void d.accept())
    await page.locator('[data-mol-id="profile-token-regenerate"]').click()
    await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
    await expect(page.locator('[data-mol-id="profile-token-copy"]')).toBeEnabled({
      timeout: 8000,
    })
    await page.locator('[data-mol-id="profile-token-copy"]').click()
    // Copy emits its own info toast — assert it lands.
    await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
  })

  test('"Cancel" reverts unsaved field edits to their persisted values', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    const original = await page.locator('[data-mol-id="profile-name-input"]').inputValue()
    await page.locator('[data-mol-id="profile-name-input"]').fill('Throwaway draft')
    await page.locator('[data-mol-id="profile-cancel"]').click()
    await expect(page.locator('[data-mol-id="profile-name-input"]')).toHaveValue(original)
  })

  test('selecting anthropic chip persists defaultProvider=anthropic', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-provider-google"]').click()
    await page.waitForTimeout(400)
    await page.locator('[data-mol-id="profile-provider-anthropic"]').click()
    await page.waitForTimeout(800)
    const after = await authedApi(request, session.accessToken!).get('/user-preferences')
    expect((await after.json())?.data?.defaultProvider).toBe('anthropic')
  })

  test('selecting openai chip persists defaultProvider=openai', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-provider-openai"]').click()
    await page.waitForTimeout(800)
    const after = await authedApi(request, session.accessToken!).get('/user-preferences')
    expect((await after.json())?.data?.defaultProvider).toBe('openai')
  })

  test('timezone field round-trips edits and persists on save', async ({ page, request }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.locator('[data-mol-id="profile-timezone-input"]').fill('Europe/Berlin')
    await page.locator('[data-mol-id="profile-save"]').click()
    await expect(page.locator('[data-mol-id="profile-info"]')).toBeVisible({ timeout: 8000 })
    const after = await authedApi(request, session.accessToken!).get('/user-preferences')
    expect((await after.json())?.data?.timezone).toBe('Europe/Berlin')
  })
})
