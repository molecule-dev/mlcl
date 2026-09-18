/**
 * /settings — company profile (PUT /api/settings/company), integrations
 * (POST/PUT), team invite (POST /api/settings/team) + remove (DELETE).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, signup } from './_helpers.js'

test.describe('settings page', () => {
  test('initial load fires three GETs (company / integrations / team)', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^settings$/i, level: 1 })).toBeVisible()
      await expect(page.getByText(/team/i).first()).toBeVisible()
    })
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/settings\/company/.test(r.url))?.status,
    ).toBeLessThan(400)
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/settings\/integrations/.test(r.url))?.status,
    ).toBeLessThan(400)
    expect(
      reqs.find((r) => r.method === 'GET' && /\/api\/settings\/team/.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('company profile saves via PUT and survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const legalName = `Legal Co ${Date.now()}`
    await page.goto(APP_BASE + '/settings')
    await page.getByLabel(/legal name/i).fill(legalName)
    await page.getByLabel(/billing email/i).fill('billing@legal.test')
    await page.getByLabel(/tax id/i).fill('12-3456789')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /save company profile/i }).click()
      await expect(page.getByText(/^Saved\.$/i)).toBeVisible({ timeout: 5000 })
    })
    const put = reqs.find((r) => r.method === 'PUT' && /\/api\/settings\/company/.test(r.url))
    expect(put?.status, 'PUT /api/settings/company').toBeLessThan(400)
    // Read-after-write
    await page.reload()
    await expect(page.getByLabel(/legal name/i)).toHaveValue(legalName)
    // GET via API confirms persistence
    const fresh = await page.request.get(`${API_BASE}/settings/company`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await fresh.json()) as { legal_name: string; billing_email: string }
    expect(body.legal_name).toBe(legalName)
    expect(body.billing_email).toBe('billing@legal.test')
  })

  test('"Add integration" POSTs and a row appears', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const before = await page
      .locator('section')
      .filter({ hasText: 'Integrations' })
      .locator('li')
      .count()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /add integration/i }).click()
      await expect(async () => {
        const after = await page
          .locator('section')
          .filter({ hasText: 'Integrations' })
          .locator('li')
          .count()
        expect(after).toBe(before + 1)
      }).toPass({ timeout: 5000 })
    })
    expect(
      reqs.find((r) => r.method === 'POST' && /\/api\/settings\/integrations/.test(r.url))?.status,
    ).toBe(201)
  })

  test('integration Connect button toggles status via PUT', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /add integration/i }).click()
    await expect(page.getByRole('button', { name: /^connect$/i }).first()).toBeVisible({
      timeout: 5000,
    })
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^connect$/i })
        .first()
        .click()
      await expect(page.getByRole('button', { name: /^disconnect$/i }).first()).toBeVisible({
        timeout: 5000,
      })
    })
    expect(
      reqs.find((r) => r.method === 'PUT' && /\/api\/settings\/integrations\//.test(r.url))?.status,
    ).toBeLessThan(400)
  })

  test('Invite teammate POSTs and the new member shows up + survives reload', async ({ page }) => {
    const { accessToken } = await signup(page)
    const memberName = `Member ${Date.now()}`
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /invite teammate/i }).click()
    await page.getByLabel(/^name$/i).fill(memberName)
    await page.getByLabel(/^teammate email$/i).fill(`m+${Date.now()}@team.test`)
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /send invite/i }).click()
      await expect(page.getByText(memberName)).toBeVisible({ timeout: 10000 })
    })
    expect(
      reqs.find((r) => r.method === 'POST' && /\/api\/settings\/team(\?|$)/.test(r.url))?.status,
    ).toBe(201)
    await page.reload()
    await expect(page.getByText(memberName)).toBeVisible({ timeout: 10000 })
    void accessToken
  })

  test('Remove teammate DELETEs and the row disappears', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('button', { name: /invite teammate/i }).click()
    await page.getByLabel(/^name$/i).fill('ToRemove')
    await page.getByLabel(/^teammate email$/i).fill(`rm+${Date.now()}@team.test`)
    await page.getByRole('button', { name: /send invite/i }).click()
    await expect(page.getByText('ToRemove')).toBeVisible({ timeout: 10000 })
    const reqs = await captureNetwork(page, async () => {
      await page
        .locator('li', { hasText: 'ToRemove' })
        .getByRole('button', { name: /remove/i })
        .click()
      await expect(page.getByText('ToRemove')).not.toBeVisible({ timeout: 5000 })
    })
    expect(
      reqs.find((r) => r.method === 'DELETE' && /\/api\/settings\/team\//.test(r.url))?.status,
    ).toBeLessThan(400)
  })
})
