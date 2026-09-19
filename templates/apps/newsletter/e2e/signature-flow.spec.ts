/**
 * SIGNATURE FLOW — draft → publish → delivery log rows created → a
 * subscriber opens their tokened link → the open lands in the stats →
 * the dashboard reflects it.
 *
 * This is the demo delivery mechanism end to end: the sends table IS the
 * delivery (no real email is sent), and the open tracker is the tokened
 * public-issue ping. Every expected value is read from the API.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  readIssueStats,
  seedIssue,
  seedSubscriber,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('publish → deliver → open → stats (signature flow)', () => {
  test('publishing creates one send per subscribed subscriber and opens update stats', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('sig-flow'))
    // Two people on the list BEFORE the issue goes out.
    const readerA = await seedSubscriber(page, accessToken)
    const readerB = await seedSubscriber(page, accessToken)

    // 1. Write a draft.
    const draft = await seedIssue(page, accessToken, { status: 'draft' })

    // 2. Publish it — delivery fans out to every subscribed subscriber.
    const publishRes = await page.request.post(`${API_BASE}/issues/${draft.id}/publish`, {
      headers: authHeaders(accessToken),
    })
    expect(publishRes.status()).toBeLessThan(400)
    const published = (await publishRes.json()) as { status: string }
    expect(published.status).toBe('published')

    // 3. The delivery log exists: stats count the two sends, none opened yet.
    let stats = await readIssueStats(page, accessToken, draft.id)
    expect(stats.delivered).toBeGreaterThanOrEqual(2)
    expect(stats.opened).toBe(0)

    // 4. Reader A opens their tokened copy of the public issue (the page
    //    pings the open tracker when ?t= is present).
    await page.goto(APP_BASE + `/issues/${draft.id}?t=${encodeURIComponent(readerA.token)}`)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 })
    await expect
      .poll(async () => (await readIssueStats(page, accessToken, draft.id)).opened, {
        timeout: 15000,
      })
      .toBe(1)

    // 5. A refresh of the same tokened URL must NOT inflate the count
    //    (the tracker is idempotent per send).
    await page.reload()
    await page.waitForTimeout(500)
    stats = await readIssueStats(page, accessToken, draft.id)
    expect(stats.opened).toBe(1)

    // 6. The dashboard surfaces the growth + open-rate KPIs.
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-mol-id="dashboard-kpi-subscribers"]')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-mol-id="dashboard-kpi-open-rate"]')).toBeVisible()
    const overviewRes = await page.request.get(`${API_BASE}/stats/overview`, {
      headers: authHeaders(accessToken),
    })
    expect(overviewRes.status()).toBe(200)
    const overview = (await overviewRes.json()) as {
      subscriberCounts: { subscribed: number }
      totals: { delivered: number; opened: number }
    }
    expect(overview.subscriberCounts.subscribed).toBeGreaterThanOrEqual(2)
    expect(overview.totals.opened).toBeGreaterThanOrEqual(1)
  })

  test('subscribers added after publishing do not retroactively receive the issue', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('sig-late'))
    // Publish FIRST, then join the list — the late reader never gets a send
    // row for that issue.
    const issue = await seedIssue(page, accessToken, { status: 'published' })
    const lateReader = await seedSubscriber(page, accessToken)
    const stats = await readIssueStats(page, accessToken, issue.id)
    // The late reader (created after the fan-out) has no send row for it:
    // delivered counts everyone subscribed AT publish time — which cannot
    // include this signup, so the aggregate must be strictly less than the
    // whole list if any later subscriber exists. Here we assert the direct
    // property: opening via the late reader's token does not count.
    const openRes = await page.request.get(
      `${API_BASE}/issues/${issue.id}/open/${encodeURIComponent(lateReader.token)}`,
    )
    expect(openRes.status()).toBe(204)
    const after = await readIssueStats(page, accessToken, issue.id)
    expect(after.opened).toBe(stats.opened)
  })
})
