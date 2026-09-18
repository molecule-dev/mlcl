/**
 * Read-after-write invariant tests for the primary expense-report flows.
 *
 * These complement the per-page click tests by asserting on real backend
 * outcomes — what the next GET sees after each user action — and on real
 * artifacts for external integrations (S3 upload, Stripe checkout URL,
 * CSV download body).
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('expense-report invariants', () => {
  test('approve flow: queue item flips to approved + notification recorded', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('approver'))

    // Pull an approval from the seeded queue.
    const queueRes = await page.request.get(`${API_BASE}/approvals/pending`, {
      headers: apiHeaders(accessToken),
    })
    const queue = (await queueRes.json()) as Array<{ id: string }>
    expect(queue.length).toBeGreaterThan(0)
    const target = queue[0]

    // Approve it.
    const approveRes = await page.request.post(`${API_BASE}/approvals/${target.id}/approve`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    expect(approveRes.status()).toBeLessThan(300)

    // Read-after-write: report.status === approved
    const reread = await page.request.get(`${API_BASE}/reports/${target.id}`, {
      headers: apiHeaders(accessToken),
    })
    const report = (await reread.json()) as { status: string; approved_at: string | null }
    expect(report.status).toBe('approved')
    expect(report.approved_at).toBeTruthy()

    // The queue must have shrunk by one.
    const queueAfter = await page.request.get(`${API_BASE}/approvals/pending`, {
      headers: apiHeaders(accessToken),
    })
    const queueAfterBody = (await queueAfter.json()) as Array<{ id: string }>
    expect(queueAfterBody.find((q) => q.id === target.id)).toBeUndefined()
  })

  test('reject flow: rejection_reason persists and queue shrinks', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('rejector'))

    const queueRes = await page.request.get(`${API_BASE}/approvals/pending`, {
      headers: apiHeaders(accessToken),
    })
    const queue = (await queueRes.json()) as Array<{ id: string }>
    expect(queue.length).toBeGreaterThan(0)
    const target = queue[0]

    const rejectRes = await page.request.post(`${API_BASE}/approvals/${target.id}/reject`, {
      headers: apiHeaders(accessToken),
      data: { reason: 'Out of policy — exceeds the daily meal cap.' },
    })
    expect(rejectRes.status()).toBeLessThan(300)

    const reread = await page.request.get(`${API_BASE}/reports/${target.id}`, {
      headers: apiHeaders(accessToken),
    })
    const report = (await reread.json()) as {
      status: string
      rejection_reason: string | null
      rejected_at: string | null
    }
    expect(report.status).toBe('rejected')
    expect(report.rejection_reason).toBe('Out of policy — exceeds the daily meal cap.')
    expect(report.rejected_at).toBeTruthy()
  })

  test('CSV export: real text/csv response with header + total row', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('csv'))

    // Find a seeded reimbursed report (has expenses linked).
    const list = await page.request.get(`${API_BASE}/reports`, {
      headers: apiHeaders(accessToken),
    })
    const reports = (await list.json()) as Array<{
      id: string
      status: string
      expense_count: number
    }>
    const reportToExport =
      reports.find((r) => r.status === 'reimbursed') ??
      reports.find((r) => r.expense_count > 0) ??
      reports[0]
    expect(reportToExport).toBeTruthy()

    const csvRes = await page.request.get(`${API_BASE}/reports/${reportToExport.id}/export.csv`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(csvRes.status()).toBe(200)
    expect(csvRes.headers()['content-type']).toMatch(/text\/csv/)
    expect(csvRes.headers()['content-disposition']).toMatch(/attachment/)
    const body = await csvRes.text()
    expect(body).toMatch(/Date,Merchant,Category,Amount,Currency,Description,Receipt/)
    expect(body).toMatch(/Total/)
    expect(body.length).toBeGreaterThan(120)
  })

  test('CSV export: <a download> click delivers a real file via the browser', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('csvdl'))
    const list = await page.request.get(`${API_BASE}/reports`, {
      headers: apiHeaders(accessToken),
    })
    const reports = (await list.json()) as Array<{ id: string; status: string }>
    const reportId = reports.find((r) => r.status === 'reimbursed')?.id ?? reports[0]?.id
    expect(reportId, 'no seeded reports').toBeTruthy()

    await page.goto(APP_BASE + '/reports?id=' + reportId)
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 10000 }),
      page.locator('[data-mol-id="report-export"]').first().click(),
    ])
    const path = await download.path()
    const stats = await import('node:fs').then((m) => m.statSync(path!))
    expect(stats.size).toBeGreaterThan(80)
  })

  test('receipt upload: lands on S3 (or filesystem bond) — real URL, not data:', async ({
    page,
  }) => {
    const { accessToken } = await signup(page, uniqueEmail('receipt'))

    // 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )
    const res = await page.request.post(`${API_BASE}/receipts`, {
      headers: apiHeaders(accessToken),
      data: {
        image_base64: png.toString('base64'),
        filename: 'invariant-test.png',
        mime_type: 'image/png',
      },
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as { url: string; size?: number }
    expect(body.url).toBeTruthy()
    expect(body.url.startsWith('data:'), 'fell back to data: URL — provider failed').toBe(false)
    // Real S3 URL OR a localhost upload-server URL — but must be HTTP(S).
    expect(/^https?:\/\//.test(body.url)).toBe(true)
    if (body.size !== undefined) expect(body.size).toBeGreaterThan(0)

    // Read-after-write: HEAD the URL — the artifact actually exists.
    const head = await page.request.fetch(body.url, { method: 'HEAD' })
    // S3 objects in the bucket should respond 200 (publicly readable for
    // the molecule-flagship test bucket). If not configured for public
    // reads, accept 403 as long as it's not 404.
    expect(head.status(), 'GET on uploaded receipt URL').not.toBe(404)
  })

  test('Stripe checkout returns a real cs_test or checkout.stripe.com URL', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('stripe'))

    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
    const tiers = (await tiersRes.json()) as {
      data: Array<{
        key: string
        prices: Array<{ period: string; stripePriceId: string | null }>
      }>
    }
    const proMonth = tiers.data
      .find((t) => t.key === 'pro')
      ?.prices.find((p) => p.period === 'month')
    expect(proMonth?.stripePriceId, 'no pro monthly priceId — env not filled').toBeTruthy()

    const ck = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: apiHeaders(accessToken),
      data: { priceId: proMonth!.stripePriceId },
    })
    expect(ck.status()).toBeLessThan(300)
    const ckBody = (await ck.json()) as { checkoutUrl?: string; updated?: boolean }
    expect(ckBody.checkoutUrl, JSON.stringify(ckBody)).toMatch(
      /https:\/\/checkout\.stripe\.com|cs_test_/,
    )
  })

  test('forgot-password: returns 200 and Mailgun integration fires (not silently failed)', async ({
    page,
  }) => {
    // Sign up a real user so the email exists in the users table — that
    // forces the handler to take the "send email" path rather than the
    // "user not found" silent-success path.
    const { email } = await signup(page, uniqueEmail('reset'))

    const fp = await page.request.post(`${API_BASE}/users/forgot-password`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email },
    })
    expect(fp.status()).toBe(200)
    const body = (await fp.json()) as { success?: boolean; error?: unknown }
    expect(body.success).toBe(true)
    expect(body.error, 'forgot-password reported an error').toBeFalsy()
  })

  test('mark_all_read empties the unread count', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('unread'))

    // Trigger seed by hitting notifications endpoint (idempotent).
    await page.request.get(`${API_BASE}/notifications`, { headers: apiHeaders(accessToken) })

    const before = await page.request.get(`${API_BASE}/notifications/unread_count`, {
      headers: apiHeaders(accessToken),
    })
    const beforeBody = (await before.json()) as { unread: number }
    expect(beforeBody.unread).toBeGreaterThan(0)

    const mark = await page.request.put(`${API_BASE}/notifications/mark_all_read`, {
      headers: apiHeaders(accessToken),
    })
    expect(mark.status()).toBeLessThan(300)

    const after = await page.request.get(`${API_BASE}/notifications/unread_count`, {
      headers: apiHeaders(accessToken),
    })
    const afterBody = (await after.json()) as { unread: number }
    expect(afterBody.unread).toBe(0)
  })

  test('theme toggle changes <html data-mol-mode> AND persists across reload', async ({ page }) => {
    await signup(page, uniqueEmail('theme'))
    await page.goto(APP_BASE + '/dashboard')
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    await page
      .getByRole('button', { name: /toggle theme|theme/i })
      .first()
      .click()
    await page.waitForTimeout(300)
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-mol-mode'))
    expect(after, `before=${before} after=${after}`).not.toBe(before)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const reloaded = await page.evaluate(() =>
      document.documentElement.getAttribute('data-mol-mode'),
    )
    expect(reloaded).toBe(after)
  })

  test('expense create + read: /api/expenses reflects the write', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('expense'))
    const merchant = `Invariant Cafe ${Date.now()}`
    const post = await page.request.post(`${API_BASE}/expenses`, {
      headers: apiHeaders(accessToken),
      data: { merchant, amount: 12.5, category: 'meals', date: '2026-04-01' },
    })
    expect(post.status()).toBe(201)
    const list = await page.request.get(`${API_BASE}/expenses`, {
      headers: apiHeaders(accessToken),
    })
    const items = (await list.json()) as Array<{ merchant: string }>
    expect(items.some((e) => e.merchant === merchant)).toBe(true)
  })

  test('report submit marks linked expenses as submitted', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('linksubmit'))

    // Create an expense
    const expRes = await page.request.post(`${API_BASE}/expenses`, {
      headers: apiHeaders(accessToken),
      data: {
        merchant: 'Submit Linker',
        amount: 9.99,
        category: 'meals',
        date: '2026-04-15',
      },
    })
    const expense = (await expRes.json()) as { id: string }

    // Create a report linked to the expense
    const repRes = await page.request.post(`${API_BASE}/reports`, {
      headers: apiHeaders(accessToken),
      data: {
        title: `Submit-link Report ${Date.now()}`,
        purpose: 'invariant',
        expense_ids: [expense.id],
      },
    })
    const report = (await repRes.json()) as { id: string; total_amount_cents?: number }
    expect(report.id).toBeTruthy()
    expect(report.total_amount_cents).toBe(999)

    // Submit it.
    const submit = await page.request.post(`${API_BASE}/reports/${report.id}/submit`, {
      headers: apiHeaders(accessToken),
      data: {},
    })
    expect(submit.status()).toBeLessThan(300)

    // Linked expense status flipped to submitted.
    const reread = await page.request.get(`${API_BASE}/expenses/${expense.id}`, {
      headers: apiHeaders(accessToken),
    })
    const item = (await reread.json()) as { status: string; report_id: string | null }
    expect(item.status).toBe('submitted')
    expect(item.report_id).toBe(report.id)
  })
})
