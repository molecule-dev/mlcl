/**
 * /statements — list of monthly statements per account, with PDF
 * download endpoint that must serve a real attachment.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  captureNetwork,
  seedAccount,
  seedStatement,
  signup,
} from './_helpers.js'

test.describe('/statements (Statements)', () => {
  test('renders eyebrow, h1, subheading and GETs /api/statements on first paint', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/statements')
      await expect(page.getByRole('heading', { name: /statements/i, level: 1 })).toBeVisible({
        timeout: 15000,
      })
    })
    expect(reqs.find((r) => /\/api\/statements(?:\?|$)/.test(r.url) && r.status < 400)).toBeTruthy()
    await expect(page.getByText(/documents/i).first()).toBeVisible()
    await expect(page.getByText(/monthly summaries/i)).toBeVisible()
  })

  test('renders empty-state copy for a fresh user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByText(/no statements available yet/i)).toBeVisible({ timeout: 15000 })
  })

  test('seeded statement appears in the list with formatted period', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await seedStatement(page, accessToken, acct.id)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByText(/april/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('total-count chip matches the number of seeded statements', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a1 = await seedAccount(page, accessToken, { name: 'A1' })
    await seedStatement(page, accessToken, a1.id)
    await seedStatement(page, accessToken, a1.id)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByText(/2 statements/i)).toBeVisible({ timeout: 15000 })
  })

  test('accounts-count chip reflects unique account_id count', async ({ page }) => {
    const { accessToken } = await signup(page)
    const a1 = await seedAccount(page, accessToken, { name: 'Stmt A1' })
    const a2 = await seedAccount(page, accessToken, { name: 'Stmt A2' })
    await seedStatement(page, accessToken, a1.id)
    await seedStatement(page, accessToken, a2.id)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByText(/2 accounts/i)).toBeVisible({ timeout: 15000 })
  })

  test('Download PDF link returns 200 from /api/statements/:id/download', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const stmt = await seedStatement(page, accessToken, acct.id)
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + `/api/statements/${stmt.id}/download`,
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status()).toBe(200)
    expect(res.headers()['content-disposition']).toMatch(/attachment/i)
  })

  test('GET /api/statements returns shaped rows: period_start_iso + download_url', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await seedStatement(page, accessToken, acct.id)
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + '/api/statements', {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as Array<{
      period_start_iso: string
      period_end_iso: string
      download_url: string
      account_last4: string
    }>
    expect(body[0].period_start_iso).toMatch(/2026-04-01/)
    expect(body[0].period_end_iso).toMatch(/2026-04-30/)
    expect(body[0].download_url).toContain('/api/statements/')
  })

  test('size chip text matches a human-readable size value', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    await seedStatement(page, accessToken, acct.id)
    await page.goto(APP_BASE + '/statements')
    await expect(page.getByText(/\d+(?:\.\d+)?(?:KB|MB|B)/).first()).toBeVisible({ timeout: 15000 })
  })

  test('row download anchor href references the download endpoint', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const stmt = await seedStatement(page, accessToken, acct.id)
    await page.goto(APP_BASE + '/statements')
    const link = page.getByRole('link', { name: /download pdf/i }).first()
    await expect(link).toBeVisible({ timeout: 15000 })
    const href = await link.getAttribute('href')
    expect(href).toBeTruthy()
    expect(String(href)).toMatch(new RegExp(`/api/statements/${stmt.id}/download$`))
  })

  test('GET /api/statements/:id returns a single shaped row', async ({ page }) => {
    const { accessToken } = await signup(page)
    const acct = await seedAccount(page, accessToken)
    const stmt = await seedStatement(page, accessToken, acct.id)
    const res = await page.request.get(APP_BASE.replace(/\/$/, '') + `/api/statements/${stmt.id}`, {
      headers: apiHeaders(accessToken),
    })
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { id: string; account_last4: string }
    expect(body.id).toBe(stmt.id)
  })

  test('GET /api/statements/:id/download for unknown id returns 404', async ({ page }) => {
    const { accessToken } = await signup(page)
    const res = await page.request.get(
      APP_BASE.replace(/\/$/, '') + '/api/statements/00000000-0000-0000-0000-000000000000/download',
      { headers: apiHeaders(accessToken) },
    )
    expect(res.status()).toBe(404)
  })
})
