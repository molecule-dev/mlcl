/**
 * Cross-page kitchen-sink journey. A real user signs up, submits a
 * piece of content, runs AI review on it (real Anthropic call),
 * approves it, creates an automation rule, and verifies all the
 * server-side invariants hold.
 *
 * If this test passes, the core moderator workflow works end-to-end
 * against a real database, real Anthropic, and real auth.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedQueueItem, signup } from './_helpers.js'

test.describe('99 user journey', () => {
  test.setTimeout(120_000)

  test('signup → submit → AI review → approve → create rule → invariants hold', async ({
    page,
  }) => {
    const { accessToken, userId } = await signup(page)

    // 1) Land on /dashboard with the empty-state KPIs.
    await expect(page).toHaveURL(/\/dashboard/)
    await expect(page.locator('h1')).toContainText(/overview/i)

    // 2) Seed an item via the API (mirrors what an upstream "submit"
    //    integration would do) and open it on the queue.
    const item = await seedQueueItem(
      page,
      accessToken,
      'Hi everyone, just sharing my recipe for spaghetti carbonara today.',
    )

    await page.goto(APP_BASE + '/queue')
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    // 3) Open the detail view, run AI review (real Anthropic call),
    //    assert ai_reviews row + verdict UI appear.
    await page.goto(`${APP_BASE}/queue/${item.id}`)
    await expect(page.locator(`text=${item.preview}`).first()).toBeVisible({ timeout: 10000 })

    const aiReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /run ai review/i }).click()
      await expect(
        page.locator(`text=/AI Recommendation|Recommend (approve|reject|escalate)/i`).first(),
      ).toBeVisible({
        timeout: 30000,
      })
    })
    const aiCall = aiReqs.find(
      (r) => /\/api\/moderation\/.+\/ai-review/.test(r.url) && r.method === 'POST',
    )
    expect(aiCall?.status, JSON.stringify(aiReqs)).toBe(200)

    // Read-after-write: item now has at least one ai_reviews row with a real model name.
    let r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    let body = await r.json()
    expect(body.ai_reviews?.length).toBeGreaterThanOrEqual(1)
    expect(body.ai_reviews[0].model).not.toBe('preview-1.0')
    expect(['approve', 'reject', 'escalate']).toContain(body.ai_reviews[0].decision)

    // 4) Approve the item from the detail page; assert decision flips.
    await page.getByRole('button', { name: /approve content/i }).click()
    await page.waitForTimeout(800)
    r = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/${item.id}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    body = await r.json()
    expect(body.decision).toBe('approve')
    expect(body.status).toBe('decided')
    expect(body.audit_log?.length).toBeGreaterThanOrEqual(1)

    // 5) Dashboard reflects the new "approved=1" KPI on the next load.
    await page.goto(APP_BASE + '/dashboard')
    const summary = await (
      await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/moderation/stats/summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ).json()
    expect(summary.approved).toBeGreaterThanOrEqual(1)
    expect(summary.decided).toBeGreaterThanOrEqual(1)
    expect(summary.total).toBeGreaterThanOrEqual(1)

    // 6) Create a rule via the form on /rules and verify it persists.
    await page.goto(APP_BASE + '/rules')
    const ruleName = `Journey rule ${Date.now()}`
    await page.locator('input[type="text"]').first().fill(ruleName)
    await page.getByRole('button', { name: /publish rule/i }).click()
    await page.waitForTimeout(800)
    const rules: Array<{ name: string }> = await (
      await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/rules`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    ).json()
    expect(rules.some((rl) => rl.name === ruleName)).toBe(true)

    // 7) Profile round-trip: change name, reload, see persistence.
    await page.goto(APP_BASE + '/profile')
    const renamed = `Journey User ${Date.now()}`
    await page.locator('#profile-name').fill(renamed)
    await page.getByRole('button', { name: /save changes/i }).click()
    await expect(page.locator('text=/profile saved/i')).toBeVisible({ timeout: 5000 })
    await page.reload()
    await expect(page.locator('#profile-name')).toHaveValue(renamed)

    // 8) Logout-style invariant: GET /api/users/:id reflects the new name.
    const userResp = await page.request.get(`${APP_BASE.replace(/\/$/, '')}/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(userResp.status()).toBe(200)
    const userBody = await userResp.json()
    expect(userBody.props?.name ?? userBody.name).toBe(renamed)
  })
})
