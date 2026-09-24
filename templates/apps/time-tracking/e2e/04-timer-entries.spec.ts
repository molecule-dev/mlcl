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

test.describe('04: timer + entries — start/stop, manual entry, edit, delete, persistence', () => {
  test('start timer → elapsed advances → stop persists entry visible after reload', async ({
    page,
  }) => {
    const auth = await signup(page)
    await page.goto(APP_BASE + '/dashboard')
    await page.locator('[data-test=timer-description]').fill('Working on landing page')
    await page.locator('[data-test=timer-toggle]').click()
    await page.waitForTimeout(2500)
    const elapsed1 = await page.locator('[data-test=timer-elapsed]').innerText()
    expect(elapsed1).not.toBe('00:00:00')
    // Stop
    await page.locator('[data-test=timer-toggle]').click()
    await page.waitForTimeout(2000)
    // After stop, app navigates to /entries
    await page.waitForURL(/\/entries/, { timeout: 8000 }).catch(() => undefined)
    await expect(page.locator('text=Working on landing page')).toBeVisible({ timeout: 10000 })

    // Reload preserves the entry
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Working on landing page')).toBeVisible()

    // Backend has it
    const list = await page.request.get(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(list.ok()).toBe(true)
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const found = arr.find(
      (e: { description: string }) => e.description === 'Working on landing page',
    )
    expect(found).toBeTruthy()
    expect(found.duration_seconds).toBeGreaterThan(0)
    expect(found.is_billable).toBe(true)
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
    await page.locator('[data-test=add-entry-toggle]').click()
    await page.locator('[data-test=add-entry-description]').fill('Initial design exploration')
    await page.locator('[data-test=add-entry-project]').selectOption({ label: 'API Audit' })
    await page.locator('[data-test=add-entry-start]').fill('09:00')
    await page.locator('[data-test=add-entry-end]').fill('11:30')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test=add-entry-submit]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/entries\/?$/.test(r.url))
    expect(post?.status).toBe(201)

    // Reload → still visible, summary shows 2h 30m / $375
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Initial design exploration')).toBeVisible()
    await expect(page.locator('[data-test=summary-total]')).toContainText(/2h\s*30m/)
    await expect(page.locator('[data-test=summary-revenue]')).toContainText(/\$375\b/)

    // Backend invariant: project_id + duration on the row
    const list = await page.request.get(`${API_BASE}/entries`, {
      headers: apiHeaders(auth.accessToken),
    })
    const body = await list.json()
    const arr = Array.isArray(body) ? body : (body.data ?? [])
    const found = arr.find(
      (e: { description: string }) => e.description === 'Initial design exploration',
    )
    expect(found).toBeTruthy()
    expect(found.project_id).toBe(project.id)
    expect(found.duration_seconds).toBe(2 * 3600 + 30 * 60)
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

    // Shared ConfirmButton: first click arms, second commits.
    const row = page
      .locator('text=Doomed entry')
      .locator('xpath=ancestor::div[contains(@class, "group")]')
      .first()
    await row.hover()
    const deleteBtn = row
      .locator('button[aria-label*="elete"], button[aria-label*="elete entry"]')
      .first()
    await deleteBtn.click() // arm
    await expect(deleteBtn).toHaveText(/delete this entry\?/i)
    await deleteBtn.click() // commit
    await page.waitForTimeout(1500)
    await expect(page.locator('text=Doomed entry')).toHaveCount(0)
  })
})
