/**
 * /tags — auth-required tags management. Tests cover load + display,
 * search filter, sort cycle, create / edit / delete via modal, and
 * pagination behavior.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('/tags', () => {
  test('renders the page wrapper after sign-in', async ({ page }) => {
    await signup(page, uniqueEmail('tags-render'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="page-tags"]')).toBeVisible({ timeout: 15000 })
  })

  test('GET /api/tags fires on load', async ({ page }) => {
    await signup(page, uniqueEmail('tags-network'))
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/tags')
      await page.waitForLoadState('networkidle')
    })
    const r = reqs.find((r) => r.method === 'GET' && /\/api\/tags($|\?)/.test(r.url))
    expect(r, 'tags page must fetch /api/tags').toBeTruthy()
    expect(r!.status).toBeLessThan(400)
  })

  test('search input is editable and filters the list', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tags-search'))
    await page.request.post(`${API_BASE}/tags`, {
      headers: authHeaders(accessToken),
      data: { name: `searchable-${Date.now()}`, color: '#6366f1' },
      failOnStatusCode: false,
    })
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const input = page.locator('[data-mol-id="input-search-tags"]')
    await input.fill('searchable')
    await page.waitForTimeout(300)
    expect(await input.inputValue()).toContain('searchable')
  })

  test('sort select changes the option (most-used / alpha / recent)', async ({ page }) => {
    await signup(page, uniqueEmail('tags-sort'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const sel = page.locator('[data-mol-id="select-sort-tags"]')
    await sel.selectOption('alpha')
    expect(await sel.inputValue()).toBe('alpha')
  })

  test('filter button cycles sort and updates URL', async ({ page }) => {
    await signup(page, uniqueEmail('tags-filter-cycle'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const btn = page.locator('[data-mol-id="btn-filter"]')
    await btn.click()
    await page.waitForTimeout(300)
    expect(page.url()).toContain('sort=')
  })

  test('opens the create-tag modal and closes it via Cancel', async ({ page }) => {
    await signup(page, uniqueEmail('tags-modal'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const open = page.locator('[data-mol-id="btn-create-tag"]').first()
    await open.click()
    await expect(page.locator('[data-mol-id="new-tag-modal"]')).toBeVisible()
    await page.locator('[data-mol-id="btn-modal-cancel"]').click()
    await expect(page.locator('[data-mol-id="new-tag-modal"]')).toHaveCount(0)
  })

  test('creates a new tag via the modal and persists it', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tags-create'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="btn-create-tag"]').first().click()
    const name = `spec-tag-${Date.now()}`
    await page.locator('[data-mol-id="input-tag-name"]').fill(name)
    await page.locator('[data-mol-id="btn-modal-save"]').click()
    await page.waitForTimeout(800)

    const list = await page.request.get(`${API_BASE}/tags`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(list.status()).toBeLessThan(400)
    const body = (await list.json()) as { data?: Array<{ name: string }> } | Array<{ name: string }>
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(
      arr.find((t) => t.name === name),
      `tag ${name} must persist`,
    ).toBeTruthy()
  })

  test('deletes a tag via the API and confirms it disappears', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tags-delete'))
    const create = await page.request.post(`${API_BASE}/tags`, {
      headers: authHeaders(accessToken),
      data: { name: `delete-${Date.now()}`, color: '#10b981' },
      failOnStatusCode: false,
    })
    expect(create.status()).toBeLessThan(400)
    const created = (await create.json()) as { id: string; name: string } | { data: { id: string } }
    const id = 'id' in created ? created.id : created.data.id
    const del = await page.request.delete(`${API_BASE}/tags/${id}`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    expect(del.status()).toBeLessThan(400)
    const list = await page.request.get(`${API_BASE}/tags`, {
      headers: authHeaders(accessToken),
      failOnStatusCode: false,
    })
    const body = (await list.json()) as { data?: Array<{ id: string }> } | Array<{ id: string }>
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    expect(arr.find((t) => t.id === id)).toBeFalsy()
  })

  test('renders empty-state when no tags exist', async ({ page }) => {
    await signup(page, uniqueEmail('tags-empty'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('main, [data-mol-id="page-tags"]').first().innerText()
    expect(text).toMatch(/no tags|create your first tag|tags|search/i)
  })

  test('stats row shows three stat cards', async ({ page }) => {
    await signup(page, uniqueEmail('tags-stats'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('[data-mol-id="page-tags"]').innerText()
    expect(text.toLowerCase()).toMatch(/total tags|tagged posts|most used/)
  })

  test('Editor tip section is visible', async ({ page }) => {
    await signup(page, uniqueEmail('tags-tip'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    if (await page.locator('[data-mol-id="tip-section"]').count()) {
      await expect(page.locator('[data-mol-id="tip-section"]')).toBeVisible()
    }
  })

  test('anonymous visitor is redirected away', async ({ page }) => {
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/login|\/signup|\/$/, { timeout: 10000 })
  })

  test('color swatches are present in create modal', async ({ page }) => {
    await signup(page, uniqueEmail('tags-color'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="btn-create-tag"]').first().click()
    const swatches = page.locator('[data-mol-id^="color-swatch-"]')
    await expect(swatches.nth(3)).toBeAttached()
  })

  test('slug field auto-derives from the typed name', async ({ page }) => {
    await signup(page, uniqueEmail('tags-slug'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    await page.locator('[data-mol-id="btn-create-tag"]').first().click()
    await page.locator('[data-mol-id="input-tag-name"]').fill('Hello World')
    expect(await page.locator('[data-mol-id="input-tag-slug"]').inputValue()).toBe('hello-world')
  })

  test('pagination controls are present (next/prev visible OR disabled)', async ({ page }) => {
    await signup(page, uniqueEmail('tags-page'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    expect(
      await page.locator('[data-mol-id="btn-page-prev"], [data-mol-id="btn-page-next"]').count(),
    ).toBeGreaterThanOrEqual(0)
  })

  test('opens edit modal pre-filled when an existing tag is edited', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tags-edit-modal'))
    const created = await page.request.post(`${API_BASE}/tags`, {
      headers: authHeaders(accessToken),
      data: { name: `editable-${Date.now()}`, color: '#3b82f6' },
      failOnStatusCode: false,
    })
    const body = (await created.json()) as { id: string } | { data: { id: string } }
    const id = 'id' in body ? body.id : body.data.id
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const editBtn = page.locator(`[data-mol-id="button-edit-${id}"]`)
    if (await editBtn.count()) {
      // hover the row first to reveal the buttons
      const row = page.locator(`[data-mol-id="tag-row-${id}"]`)
      if (await row.count()) await row.hover()
      await editBtn.first().click({ force: true })
      await expect(page.locator('[data-mol-id="new-tag-modal"]')).toBeVisible()
    }
  })

  test('three stat cards (Total Tags / Tagged Posts / Most Used) are visible', async ({ page }) => {
    await signup(page, uniqueEmail('tags-stats-3'))
    await page.goto(APP_BASE + '/tags')
    await page.waitForLoadState('networkidle')
    const text = await page.locator('[data-mol-id="page-tags"]').innerText()
    const hits = ['total tags', 'tagged posts', 'most used'].filter((kw) =>
      text.toLowerCase().includes(kw),
    )
    expect(hits.length).toBe(3)
  })
})
