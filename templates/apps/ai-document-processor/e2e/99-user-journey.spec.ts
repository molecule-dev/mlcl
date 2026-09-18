import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
  uploadInvoice,
} from './_helpers'

/**
 * Cross-page kitchen-sink user journey for ai-document-processor (Parcela).
 *
 * Covers: signup → dashboard → upload (real Anthropic) → documents list
 * shows new doc → document-detail (download → 200 with bytes) → rules
 * (create + verify in DB) → settings (PATCH name + reload persists +
 * generate API key plaintext-once) → pricing → login round-trip.
 */
test.describe('Kitchen-sink user journey', () => {
  test('a fresh accounting team onboards, ingests, classifies, and configures', async ({
    page,
  }) => {
    test.setTimeout(180_000)

    // 1. Sign up — lands on /dashboard.
    const creds = await signup(page, { email: uniqueEmail('journey'), name: 'Journey Tester' })
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 })

    // 2. Dashboard fires its KPI + recent-doc reads.
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('domcontentloaded')
    const dashReqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await Promise.all([
        page.waitForResponse(
          (r) => /\/api\/reports\/dashboard_stats/.test(r.url()) && r.status() === 200,
          { timeout: 15_000 },
        ),
        page.waitForResponse(
          (r) => /\/api\/documents(?:\?|$)/.test(r.url()) && r.request().method() === 'GET',
          { timeout: 15_000 },
        ),
      ])
    })
    expect(dashReqs.find((r) => /\/api\/reports\/dashboard_stats/.test(r.url))).toBeDefined()

    // 3. Upload a synthetic invoice via the real /upload pipeline (Anthropic).
    const uploaded = await uploadInvoice(page, `journey-inv-${Date.now()}.txt`)
    expect(uploaded.document_type).toBe('invoice')
    expect(uploaded.classification_confidence).toBeGreaterThan(0)

    // 4. Documents list reflects the new doc.
    // Arm the response wait BEFORE goto — the /api/documents fetch can resolve
    // before the awaiter subscribes, causing a 15s timeout.
    const docsListResponse = page.waitForResponse(
      (r) => /\/api\/documents/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/documents')
    await docsListResponse
    await expect(page.getByText(uploaded.original_name).first()).toBeVisible({ timeout: 10_000 })

    // 5. Detail page renders title + summary + audit, Download returns the bytes.
    const detailResponse = page.waitForResponse(
      (r) => /\/api\/documents\//.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + `/documents/${uploaded.id}`)
    await detailResponse
    await expect(page.locator('[data-mol-id="document-detail-title"]')).toHaveText(
      uploaded.original_name,
    )
    await expect(page.locator('[data-mol-id="document-summary-card"]')).toBeVisible({
      timeout: 15_000,
    })
    const token = await getAccessToken(page)
    const dl = await page.request.get(API_BASE + `/documents/${uploaded.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(dl.status()).toBe(200)
    expect((await dl.body()).byteLength).toBeGreaterThan(100)

    // 6. Rules — create one via UI; verify in API.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    const ruleName = `journey-rule-${Date.now()}`
    await page.locator('[data-mol-id="rules-form-name"]').fill(ruleName)
    await page.locator('[data-mol-id="rules-form-type"]').selectOption('invoice')
    await page.locator('[data-mol-id="rules-form-destination"]').fill('/AP/Invoices')
    const rulePostPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/extraction-rules$/.test(r.url()),
      { timeout: 15_000 },
    )
    await page.locator('[data-mol-id="rules-form-submit"]').click()
    const ruleResp = await rulePostPromise
    expect(ruleResp.status()).toBeLessThan(400)
    const rulesList = await page.request.get(API_BASE + '/extraction-rules', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const rulesItems = (await rulesList.json()) as Array<{
      name: string
      destination?: string
    }>
    const mine = rulesItems.find((r) => r.name === ruleName)
    expect(mine, 'created rule should appear in API list').toBeDefined()
    expect(mine!.destination).toBe('/AP/Invoices')

    // 7. Settings — patch name + reload to confirm persistence.
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('domcontentloaded')
    const newName = `Journey ${Date.now()}`
    await page.locator('[data-mol-id="settings-account-name"]').fill(newName)
    const settingsPatchPromise = page.waitForResponse(
      (r) => r.request().method() === 'PATCH' && /\/api\/users\//.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-account-save"]').click()
    const settingsResp = await settingsPatchPromise
    expect(settingsResp.status()).toBeLessThan(400)
    await page.reload()
    await expect(page.locator('[data-mol-id="settings-account-name"]')).toHaveValue(newName, {
      timeout: 5_000,
    })

    // 8. Generate an API key — plaintext renders once, list reflects.
    const tokenLabel = `journey-key-${Date.now()}`
    await page.locator('[data-mol-id="settings-api-label"]').fill(tokenLabel)
    const tokenPostPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/api-tokens$/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="settings-api-generate"]').click()
    await tokenPostPromise
    await expect(page.locator('[data-mol-id="settings-api-secret"]')).toBeVisible({
      timeout: 5_000,
    })

    // 9. Pricing — page loads tiers from API.
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/^free$/i).first()).toBeVisible({ timeout: 10_000 })

    // 10. Logout via storage clear, log back in via UI.
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/login')
    await page.locator('input[type="email"]').fill(creds.email)
    await page.locator('input[type="password"]').fill(creds.password)
    await page
      .getByRole('button', { name: /sign in|log in/i })
      .first()
      .click()
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
  })
})
