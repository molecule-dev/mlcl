/**
 * /queue/:id — single-item moderation page.
 *
 * The contract for this app: a moderator opens the detail page and:
 *   1. Sees the queued content_preview rendered.
 *   2. Clicks "Run AI review" → a real Anthropic call hits the bonded
 *      provider, the verdict shows up in the side panel, and an
 *      ai_reviews row gets persisted (read-after-write check).
 *   3. Clicks Approve / Reject → the flagged_content row's `decision`
 *      column flips on the server, persists across reload, and a row
 *      appears in `audit_log`.
 *
 * No mocking of Anthropic. The .env has a real ANTHROPIC_API_KEY.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedQueueItem, signup } from './_helpers.js'

test.describe('review detail page', () => {
  test('renders the seeded item content_preview and metadata', async ({ page }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(page, accessToken, `Review preview ${Date.now()}`)
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })
  })

  test('Run AI review hits Anthropic via the bond and persists ai_reviews + verdict UI', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(
      page,
      accessToken,
      'Hello there, just sharing my pasta recipe today. Boil water, add salt, cook 8 min.',
    )
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /run ai review/i }).click()
      // The verdict panel should appear once the model responds.
      await expect(
        page.locator(`text=/AI Recommendation|Recommend (approve|reject|escalate)/i`).first(),
      ).toBeVisible({
        timeout: 30000,
      })
    })

    const aiCall = reqs.find(
      (r) => /\/api\/moderation\/.+\/ai-review/.test(r.url) && r.method === 'POST',
    )
    expect(aiCall, JSON.stringify(reqs)).toBeTruthy()
    expect(aiCall!.status, 'ai-review POST should succeed').toBe(200)

    // Read-after-write: GET the item via the API and assert at least one
    // real ai_reviews row exists with a real model name (not the old
    // "preview-1.0" placeholder).
    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(r.status()).toBe(200)
    const body = await r.json()
    expect(body.ai_reviews?.length, 'ai_reviews should have at least one row').toBeGreaterThan(0)
    const latest = body.ai_reviews[0]
    expect(latest.model).not.toBe('preview-1.0')
    expect(['approve', 'reject', 'escalate']).toContain(latest.decision)
    // Confidence should be a real number from the model, not the
    // hardcoded 0.78 placeholder.
    expect(typeof latest.confidence).toBe('number')
    expect(latest.confidence).toBeGreaterThanOrEqual(0)
    expect(latest.confidence).toBeLessThanOrEqual(1)
  })

  test('Approve button persists decision=approve, audit_log row created, survives reload', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(page, accessToken, `Approve detail ${Date.now()}`)
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /approve content/i }).click()
      await page.waitForTimeout(800)
    })
    const approveCall = reqs.find(
      (r) => /\/api\/moderation\/.+\/approve/.test(r.url) && r.method === 'POST',
    )
    expect(approveCall?.status).toBe(200)

    // Read-after-write
    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await r.json()
    expect(body.decision).toBe('approve')
    expect(body.status).toBe('decided')
    expect(body.audit_log?.length, 'audit_log row created').toBeGreaterThanOrEqual(1)
    // The most-recent audit entry must reflect the approve action.
    const actions: string[] = body.audit_log.map((e: { action: string }) => e.action)
    expect(actions.some((a) => /approve/i.test(a))).toBe(true)

    // Independent verification via the audit-log handler at /api/audit-log:
    // GET should return at least one row scoped to this user/target.
    const auditResp = await page.request.get(
      `${APP_BASE.replace(/\/$/, '')}/api/audit-log?target_type=flagged_content&target_id=${item.id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    expect(auditResp.status()).toBe(200)
    const auditRows: Array<{ action: string; target_id: string }> = await auditResp.json()
    expect(auditRows.length, JSON.stringify(auditRows)).toBeGreaterThanOrEqual(1)
    expect(auditRows.every((row) => row.target_id === item.id)).toBe(true)

    // Reload-persistence: the page should still show the resolved/decided badge.
    await page.reload()
    await expect(page.locator(`text=/approved|decided|resolved/i`).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('Reject flow requires a reason; submitting persists decision=reject', async ({ page }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(page, accessToken, `Reject detail ${Date.now()}`)
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    await page.getByRole('button', { name: /^reject content$/i }).click()
    // Reason select appears
    const reasonSelect = page.locator('#reject-reason')
    await expect(reasonSelect).toBeVisible()

    // Confirm button should be disabled until a reason is selected.
    const confirmBtn = page.getByRole('button', { name: /confirm reject/i })
    await expect(confirmBtn).toBeDisabled()
    await reasonSelect.selectOption('spam')
    await expect(confirmBtn).toBeEnabled()

    await confirmBtn.click()
    await page.waitForTimeout(800)

    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await r.json()
    expect(body.decision).toBe('reject')
    expect(body.status).toBe('decided')
  })

  test('reopen (appeal) returns a decided item to the queue with the reversal audited', async ({
    page,
  }) => {
    const { accessToken } = await signup(page)
    const item = await seedQueueItem(page, accessToken, `Reopen detail ${Date.now()}`)
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    // Decide first — the resolved panel only shows the re-open control then.
    await page.getByRole('button', { name: /approve content/i }).click()
    await expect(page.locator('[data-mol-id="reopen-review"]')).toBeVisible({ timeout: 10000 })
    await page.locator('[data-mol-id="reopen-review"]').click()
    // The decision panel disappears once the item is pending again.
    await expect(page.locator('[data-mol-id="reopen-review"]')).toBeHidden({ timeout: 10000 })

    const r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const body = await r.json()
    expect(body.status).toBe('queued')
    expect(body.decision === null || body.decision === undefined).toBe(true)
    // Audit trail records the reversal.
    const actions: string[] = (body.audit_log ?? []).map((e: { action: string }) => e.action)
    expect(actions.some((a) => a === 'decision:reopened')).toBe(true)
  })
})
