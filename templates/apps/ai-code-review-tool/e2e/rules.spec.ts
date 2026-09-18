import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('Rules editor', () => {
  test('empty state shows when no rules exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator('[data-mol-id="rules-empty"]')).toBeVisible()
  })

  test('create-rule form renders with name/pattern/language/severity controls', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator('[data-mol-id="rules-new-name"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="rules-new-pattern"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="rules-new-language"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="rules-create-btn"]')).toBeVisible()
  })

  test('submitting a valid rule POSTs /api/custom-rules and the row appears + persists', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    await page.goto(APP_BASE + '/rules')
    const ruleName = `no-todo-${Date.now()}`
    await page.locator('[data-mol-id="rules-new-name"]').fill(ruleName)
    await page.locator('[data-mol-id="rules-new-pattern"]').fill('TODO|FIXME')
    await page.locator('[data-mol-id="rules-new-language"]').fill('typescript')
    await page.locator('[data-mol-id="rules-new-description"]').fill('flag scratchpad markers')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="rules-create-btn"]').click()
      await page
        .locator(`[data-mol-id="rule-row"]:has-text("${ruleName}")`)
        .waitFor({ timeout: 10000 })
    })
    const postRule = whereUrl(reqs, /\/api\/custom-rules(?:\?|$)/, 'POST')
    expect(postRule.length).toBeGreaterThan(0)
    expect(postRule[0].status).toBe(201)

    // Read-after-write
    const api = await authedApi(request, session.accessToken!)
    const list = await (await api.get('/custom-rules')).json()
    expect(list.some((r: { name: string }) => r.name === ruleName)).toBe(true)

    // Reload-persistence
    await page.reload()
    await expect(page.locator(`[data-mol-id="rule-name"]:has-text("${ruleName}")`)).toBeVisible()
  })

  test('invalid regex shows inline create-error and does NOT POST', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await page.locator('[data-mol-id="rules-new-name"]').fill('bad-regex')
    await page.locator('[data-mol-id="rules-new-pattern"]').fill('([')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="rules-create-btn"]').click()
      await page.waitForTimeout(800)
    })
    await expect(page.locator('[data-mol-id="rules-create-error"]')).toBeVisible()
    const postRule = whereUrl(reqs, /\/api\/custom-rules(?:\?|$)/, 'POST')
    expect(postRule.length, 'invalid regex must NOT reach the API').toBe(0)
  })

  test('toggling enabled then Save policy PUTs /api/custom-rules/:id with enabled=false', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/custom-rules', {
        name: 'toggle-rule-' + Date.now(),
        pattern: 'console\\.log',
        severity: 'med',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const row = page.locator(`[data-mol-id="rule-row"][data-rule-id="${created.id}"]`)
    await expect(row).toBeVisible()
    const toggle = row.locator('[data-mol-id="rule-toggle"]')
    await toggle.click()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="rules-save-btn"]').click()
      await page.locator('[data-mol-id="rules-saved-at"]').waitFor({ timeout: 10000 })
    })
    const putRule = whereUrl(reqs, new RegExp(`/api/custom-rules/${created.id}`), 'PUT')
    expect(putRule.length).toBe(1)
    expect(putRule[0].status).toBeLessThan(400)
    // verify backend invariant
    const after = await (await api.get('/custom-rules')).json()
    expect(after.find((r: { id: string }) => r.id === created.id).enabled).toBe(false)
  })

  test('changing severity then Save policy PUTs /api/custom-rules/:id with new severity', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/custom-rules', {
        name: 'sev-rule-' + Date.now(),
        pattern: 'eval\\(',
        severity: 'low',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const row = page.locator(`[data-mol-id="rule-row"][data-rule-id="${created.id}"]`)
    await row.getByRole('button', { name: /^high$/i }).click()
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="rules-save-btn"]').click()
      await page.locator('[data-mol-id="rules-saved-at"]').waitFor({ timeout: 10000 })
    })
    expect(whereUrl(reqs, new RegExp(`/api/custom-rules/${created.id}`), 'PUT').length).toBe(1)
    const after = await (await api.get('/custom-rules')).json()
    expect(after.find((r: { id: string }) => r.id === created.id).severity).toBe('high')
  })

  test('delete button DELETEs /api/custom-rules/:id and the row disappears', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/custom-rules', {
        name: 'delete-me-' + Date.now(),
        pattern: 'XXX',
        severity: 'low',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const row = page.locator(`[data-mol-id="rule-row"][data-rule-id="${created.id}"]`)
    await expect(row).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      const responsePromise = page.waitForResponse(
        (resp) =>
          new RegExp(`/api/custom-rules/${created.id}`).test(resp.url()) &&
          resp.request().method() === 'DELETE',
        { timeout: 8000 },
      )
      await row.locator('[data-mol-id="rule-delete"]').click()
      await expect(row).toBeHidden({ timeout: 5000 })
      const resp = await responsePromise
      expect(resp.status()).toBe(204)
    })
    const del = whereUrl(reqs, new RegExp(`/api/custom-rules/${created.id}`), 'DELETE')
    expect(del.length).toBeGreaterThanOrEqual(1)
    const after = await (await api.get('/custom-rules')).json()
    expect(after.find((r: { id: string }) => r.id === created.id)).toBeUndefined()
  })

  test('Save policy is disabled until a change is queued', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator('[data-mol-id="rules-save-btn"]')).toBeDisabled()
  })

  test('AuthGuard redirects anonymous users to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/rules')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('initial load fires GET /api/custom-rules', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/rules')
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const gets = whereUrl(reqs, /\/api\/custom-rules(?:\?|$)/, 'GET')
    expect(gets.length).toBeGreaterThan(0)
    expect(gets[0]!.status).toBe(200)
  })

  test('Severity buttons (low/med/high/critical) are present in the create form', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator('[data-mol-id="rules-new-name"]')).toBeVisible()
    // The severity buttons exist either in the create row or per-rule rows.
    // We at least expect a severity-selector control.
    const severityButtons = page.getByRole('button', { name: /^(low|med|high|critical)$/i })
    expect(await severityButtons.count(), 'expected severity selector controls').toBeGreaterThan(0)
  })

  test('rules description field is rendered in the create form', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await expect(page.locator('[data-mol-id="rules-new-description"]')).toBeVisible()
  })

  test('rule row exposes a toggle and delete control after creation', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/custom-rules', {
        name: 'controls-' + Date.now(),
        pattern: 'XXX',
        severity: 'low',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const row = page.locator(`[data-mol-id="rule-row"][data-rule-id="${created.id}"]`)
    await expect(row.locator('[data-mol-id="rule-toggle"]')).toBeVisible()
    await expect(row.locator('[data-mol-id="rule-delete"]')).toBeVisible()
  })

  test('Saved-at indicator appears after a successful save', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const created = await (
      await api.post('/custom-rules', {
        name: 'savedat-' + Date.now(),
        pattern: 'YYY',
        severity: 'med',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const row = page.locator(`[data-mol-id="rule-row"][data-rule-id="${created.id}"]`)
    await row.locator('[data-mol-id="rule-toggle"]').click()
    await page.locator('[data-mol-id="rules-save-btn"]').click()
    await expect(page.locator('[data-mol-id="rules-saved-at"]')).toBeVisible({ timeout: 10000 })
  })

  test('rule name appears in the row label after creation', async ({ page, request }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)
    const stamp = Date.now()
    const created = await (
      await api.post('/custom-rules', {
        name: 'label-test-' + stamp,
        pattern: 'ZZZ',
        severity: 'high',
        enabled: true,
      })
    ).json()
    await page.goto(APP_BASE + '/rules')
    const nameEl = page.locator(`[data-mol-id="rule-name"]:has-text("label-test-${stamp}")`)
    await expect(nameEl).toBeVisible()
    void created
  })

  test('empty pattern is rejected without a POST', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/rules')
    await page.locator('[data-mol-id="rules-new-name"]').fill('empty-pattern')
    // Leave pattern empty.
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator('[data-mol-id="rules-create-btn"]')
        .click({ force: true })
        .catch(() => {})
      await page.waitForTimeout(800)
    })
    const posts = whereUrl(reqs, /\/api\/custom-rules(?:\?|$)/, 'POST')
    expect(posts.length, 'POST must NOT fire with empty pattern').toBe(0)
  })
})
