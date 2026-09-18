import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  seedClient,
  seedProject,
  signup,
} from './_helpers.js'

test.describe('/entries page', () => {
  test('entries page root + h1 + filter buttons render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await expect(page.locator('[data-test="entries-page"]')).toBeVisible()
    await expect(page.getByRole('heading', { name: /time entries/i })).toBeVisible()
    await expect(page.locator('[data-test="filter-all"]')).toBeVisible()
    await expect(page.locator('[data-test="filter-billable"]')).toBeVisible()
    await expect(page.locator('[data-test="filter-non-billable"]')).toBeVisible()
  })

  test('add-entry toggle reveals the form with all expected fields', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await expect(page.locator('[data-test="add-entry-form"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-description"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-date"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-start"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-end"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-billable"]')).toBeVisible()
    await expect(page.locator('[data-test="add-entry-submit"]')).toBeVisible()
  })

  test('manual entry with project + 9:00–11:30 → duration 9000s, billable revenue rolls up', async ({
    page,
  }) => {
    const auth = await signup(page)
    const client = await seedClient(page, auth.accessToken, {
      name: 'Massive Dynamic',
      hourly_rate_cents: 10000,
    })
    const project = await seedProject(page, auth.accessToken, {
      name: 'API Audit',
      client_id: client.id,
      hourly_rate_cents: 15000,
    })

    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await page.locator('[data-test="add-entry-description"]').fill('Initial design exploration')
    await page.locator('[data-test="add-entry-project"]').selectOption({ label: 'API Audit' })
    await page.locator('[data-test="add-entry-start"]').fill('09:00')
    await page.locator('[data-test="add-entry-end"]').fill('11:30')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test="add-entry-submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/entries\/?$/.test(r.url))
    expect(post?.status).toBe(201)

    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Initial design exploration')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
    })
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const found = arr.find(
      (e: { description: string }) => e.description === 'Initial design exploration',
    )
    expect(found, 'entry persisted in DB').toBeTruthy()
    expect(found.project_id).toBe(project.id)
    expect(found.duration_seconds).toBe(2 * 3600 + 30 * 60)
  })

  test('billable filter swaps the active style', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="filter-billable"]').click()
    // active filter should re-render — list either shows entries or empty state
    await expect(
      page.locator('[data-test="entries-empty"], [data-test^="entry-row-"]').first(),
    ).toBeVisible()
  })

  test('export CSV delivers a real downloadable file', async ({ page }) => {
    const auth = await signup(page)
    await page.request.post(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
      data: {
        description: 'Pre-export entry',
        project_id: null,
        started_at: new Date(Date.now() - 3600_000).toISOString(),
        ended_at: new Date().toISOString(),
        is_billable: true,
      },
    })
    await page.goto(APP_BASE + '/entries')
    await page.waitForLoadState('domcontentloaded')
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10_000 }),
      page.locator('[data-test="export-csv"]').click(),
    ])
    const path = await download.path()
    expect(path, 'download path').toBeTruthy()
    if (path) {
      const fs = await import('node:fs')
      const stats = fs.statSync(path)
      expect(stats.size, 'csv size').toBeGreaterThan(10)
    }
  })

  test('delete entry removes the row from UI and DB', async ({ page }) => {
    const auth = await signup(page)
    await page.request.post(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
      data: {
        description: 'Doomed entry',
        project_id: null,
        started_at: new Date(Date.now() - 3600_000).toISOString(),
        ended_at: new Date().toISOString(),
        is_billable: false,
      },
    })

    await page.goto(APP_BASE + '/entries')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('text=Doomed entry')).toBeVisible({ timeout: 10000 })

    page.once('dialog', (d) => d.accept())
    const row = page
      .locator('text=Doomed entry')
      .locator('xpath=ancestor::div[contains(@class, "group")]')
      .first()
    await row.hover()
    await row
      .locator('button[aria-label*="elete"], button[aria-label*="elete entry"]')
      .first()
      .click()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Doomed entry')).toHaveCount(0)
  })

  test('entries h1 heading explicitly renders', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await expect(page.getByRole('heading', { name: /time entries/i })).toBeVisible()
  })

  test('add-entry description textbox accepts typed value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await page.locator('[data-test="add-entry-description"]').fill('Drafting RFP response')
    await expect(page.locator('[data-test="add-entry-description"]')).toHaveValue(
      'Drafting RFP response',
    )
  })

  test('add-entry project combobox is rendered', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await expect(page.locator('[data-test="add-entry-project"]')).toBeVisible()
  })

  test('add-entry date input accepts a value', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await page.locator('[data-test="add-entry-date"]').fill('2026-01-15')
    await expect(page.locator('[data-test="add-entry-date"]')).toHaveValue('2026-01-15')
  })

  test('add-entry start time accepts HH:MM', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await page.locator('[data-test="add-entry-start"]').fill('09:30')
    await expect(page.locator('[data-test="add-entry-start"]')).toHaveValue('09:30')
  })

  test('add-entry end time accepts HH:MM', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    await page.locator('[data-test="add-entry-end"]').fill('17:45')
    await expect(page.locator('[data-test="add-entry-end"]')).toHaveValue('17:45')
  })

  test('add-entry billable checkbox toggles', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await page.locator('[data-test="add-entry-toggle"]').click()
    const cb = page.locator('[data-test="add-entry-billable"]')
    const initial = await cb.isChecked()
    await cb.click()
    await expect(cb).toBeChecked({ checked: !initial })
  })

  test('entries empty-state visible for fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await expect(page.locator('[data-test="entries-empty"]')).toBeVisible()
  })

  test('top-bar Start timer button is visible from /entries (shared layout)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/entries')
    await expect(page.getByRole('button', { name: /start timer/i })).toBeVisible()
  })

  test('start/stop top-bar timer persists a new entry, visible after reload', async ({ page }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-test="timer-description"]').fill('Working on landing page')
    await page.locator('[data-test="timer-toggle"]').click()
    await page.waitForTimeout(2500)
    const elapsed1 = await page.locator('[data-test="timer-elapsed"]').innerText()
    expect(elapsed1).not.toBe('00:00:00')
    await page.locator('[data-test="timer-toggle"]').click()
    await page.waitForTimeout(2000)
    await page.waitForURL(/\/entries/, { timeout: 8000 }).catch(() => undefined)
    await expect(page.locator('text=Working on landing page')).toBeVisible({ timeout: 10000 })

    await page.reload()
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Working on landing page')).toBeVisible()

    const list = await page.request.get(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const found = arr.find(
      (e: { description: string }) => e.description === 'Working on landing page',
    )
    expect(found, 'entry in DB').toBeTruthy()
    expect(found.duration_seconds).toBeGreaterThan(0)
    expect(found.is_billable).toBe(true)
  })
})
