import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

test.describe('/settings', () => {
  test('renders Settings heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { level: 1, name: /^Settings$/i })).toBeVisible()
  })

  test('cloud-backup toggle flips and PUTs preferences', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const toggle = page.getByTestId('privacy-toggle-cloud_backup')
    await expect(toggle).toBeEnabled({ timeout: 10_000 })
    const before = await toggle.getAttribute('aria-pressed')
    // Register the response listener BEFORE the click so a fast PUT can't slip past us.
    const reqs = await captureNetwork(page, async () => {
      const putWait = page.waitForResponse(
        (r) => r.url().includes('/api/journal/preferences') && r.request().method() === 'PUT',
        { timeout: 15_000 },
      )
      await toggle.click()
      await putWait
    })
    const after = await toggle.getAttribute('aria-pressed')
    expect(after).not.toBe(before)
    expect(
      reqs.find((r) => r.method === 'PUT' && r.url.includes('/api/journal/preferences')),
      'PUT preferences observed',
    ).toBeDefined()
  })

  test('reminder toggle flips state', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const t = page.getByTestId('reminder-toggle')
    await expect(t).toBeEnabled({ timeout: 10_000 })
    const before = await t.getAttribute('aria-pressed')
    const putWait = page.waitForResponse(
      (r) => r.url().includes('/api/journal/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    )
    await t.click()
    await putWait
    const after = await t.getAttribute('aria-pressed')
    expect(after).not.toBe(before)
  })

  test('reminder-time button selects 22:30', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const t = page.getByTestId('reminder-time-22:30')
    await expect(t).toBeEnabled({ timeout: 10_000 })
    const putWait = page.waitForResponse(
      (r) => r.url().includes('/api/journal/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    )
    await t.click()
    await putWait
    expect(await t.getAttribute('aria-pressed')).toBe('true')
  })

  test('theme dark selects and persists', async ({ page }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const themeDark = page.getByTestId('theme-dark')
    await expect(themeDark).toBeEnabled({ timeout: 10_000 })
    const putWait = page.waitForResponse(
      (r) => r.url().includes('/api/journal/preferences') && r.request().method() === 'PUT',
      { timeout: 15_000 },
    )
    await themeDark.click()
    await putWait
    // Read-after-write: GET preferences via API confirms theme=dark
    const tokenRes = await fetch(API_BASE + '/users/log-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: creds.email, password: creds.password }),
    })
    const { accessToken } = (await tokenRes.json()) as { accessToken: string }
    const prefsRes = await fetch(API_BASE + '/journal/preferences', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const prefs = (await prefsRes.json()) as { theme: string }
    expect(prefs.theme).toBe('dark')
  })

  test('export JSON triggers GET /api/journal/export/json', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const btn = page.getByTestId('export-json')
    await expect(btn).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      const respWait = page.waitForResponse((r) => r.url().includes('/api/journal/export/json'), {
        timeout: 15_000,
      })
      await btn.click()
      await respWait
    })
    const exp = reqs.find((r) => r.url.includes('/api/journal/export/json'))
    expect(exp, 'GET /api/journal/export/json observed').toBeDefined()
    expect(exp!.status, 'export returned 2xx').toBeLessThan(300)
  })

  test('export CSV triggers GET /api/journal/export/csv', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForResponse((r) => r.url().includes('/api/journal/preferences'), {
      timeout: 15_000,
    })
    const btn = page.getByTestId('export-csv')
    await expect(btn).toBeVisible()
    const reqs = await captureNetwork(page, async () => {
      const respWait = page.waitForResponse((r) => r.url().includes('/api/journal/export/csv'), {
        timeout: 15_000,
      })
      await btn.click()
      await respWait
    })
    const exp = reqs.find((r) => r.url.includes('/api/journal/export/csv'))
    expect(exp, 'GET /api/journal/export/csv observed').toBeDefined()
    expect(exp!.status, 'export returned 2xx').toBeLessThan(300)
  })

  test('delete-account button reveals confirmation panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const open = page.getByTestId('delete-account-open')
    await expect(open).toBeVisible()
    await open.click()
    await expect(page.getByTestId('delete-account-confirm')).toBeVisible()
  })
})
