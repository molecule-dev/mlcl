import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  API_BASE,
  apiHeaders,
  captureNetwork,
  createDeviceApi,
  ingestTelemetry,
  signup,
} from './_helpers.js'

test.describe('Settings — device API tokens (real ingest credentials)', () => {
  test('Empty fleet → API keys panel says register a device first', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /API keys/i }).click()
    await expect(page.getByText(/Register a device first to issue ingest tokens/i)).toBeVisible()
  })

  test('Issue → reveal once → token actually authenticates ingest → revoke removes', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const dev = await createDeviceApi(page, accessToken, {
      name: 'TokenHost',
      device_type: 'sensor',
    })
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /API keys/i }).click()
    await expect(page.getByText(/No tokens issued yet/i)).toBeVisible()

    await page.getByRole('button', { name: /Issue token/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.locator('input').fill('e2e-ingest')
    let plaintext = ''
    const reqs = await captureNetwork(page, async () => {
      // The submit-button label is "Issue token". The cancel/done button is also
      // visible inside the dialog so be careful — submit is type=submit.
      await dialog.locator('button[type="submit"]').click()
      // After submit, the modal switches to reveal the plaintext token (a <pre>).
      await expect(dialog.locator('pre')).toBeVisible({ timeout: 10000 })
      plaintext = (await dialog.locator('pre').textContent())?.trim() ?? ''
    })
    const post = reqs.find(
      (r) => r.method === 'POST' && new RegExp(`/api/devices/${dev.id}/tokens`).test(r.url),
    )
    expect(post, `expected POST /api/devices/${dev.id}/tokens`).toBeTruthy()
    expect(post!.status).toBeLessThan(300)
    expect(plaintext.length, 'token plaintext should be non-empty').toBeGreaterThan(20)

    await dialog.getByRole('button', { name: /Done/i }).click()
    await expect(dialog).toBeHidden({ timeout: 10000 })
    await expect(page.getByText('e2e-ingest')).toBeVisible()

    // Real ingest: post telemetry as the device using the plaintext token. If the
    // token doesn't actually work, this fails.
    const tel = await ingestTelemetry(page, plaintext, {
      metric: 'temperature',
      value: 23.5,
      unit: 'C',
    })
    expect(tel).toBeTruthy()

    // Read-after-write: the device's status should now be "online" because
    // telemetry ingest updates last_seen.
    const after = await page.request.get(`${API_BASE}/devices/${dev.id}`, {
      headers: apiHeaders(accessToken),
      failOnStatusCode: false,
    })
    const devAfter = (await after.json()) as { status: string; last_seen: string | null }
    expect(devAfter.status).toBe('online')
    expect(devAfter.last_seen).toBeTruthy()

    // Revoke
    await page
      .getByRole('button', { name: /^Revoke$/i })
      .first()
      .click()
    await page.waitForTimeout(800)
    await expect(page.getByText('e2e-ingest')).toHaveCount(0, { timeout: 10000 })
    // The token should now reject ingest with 401.
    const reject = await page.request.post(`${API_BASE}/telemetry`, {
      headers: { Authorization: `Bearer ${plaintext}`, 'Content-Type': 'application/json' },
      data: { metric: 'temperature', value: 24 },
      failOnStatusCode: false,
    })
    expect(reject.status()).toBe(401)
  })

  test('Plan & billing panel shows the plan and links to /pricing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {})
    await page.getByRole('button', { name: /Plan & billing/i }).click()
    await expect(page.getByText(/Current plan/i)).toBeVisible()
    await page.getByRole('button', { name: /View plans/i }).click()
    await page.waitForURL(/\/pricing/, { timeout: 10000 })
  })
})
