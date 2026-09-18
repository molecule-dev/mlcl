/**
 * Cross-user approval flow:
 *   - User A signs up
 *   - User B signs up
 *   - A creates+submits a report addressed to B (by email)
 *   - B sees the report in their /approvals queue
 *   - B approves it
 *   - A's /notifications shows the approval and the report flips to
 *     `approved`
 *
 * Backend invariant: when the submitter only knows the approver's email,
 * the submit handler must resolve approver_id from the users table so the
 * report actually shows up in the approver's queue. Without that, the
 * "type your manager's email" UX is dead-on-arrival — the manager never
 * sees the request.
 */
import { test, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

async function getJSON<T>(req: APIRequestContext, url: string, token: string): Promise<T> {
  const res = await req.get(url, { headers: apiHeaders(token) })
  expect(res.status(), await res.text()).toBeLessThan(400)
  return (await res.json()) as T
}

test('A submits to B by email; B sees + approves; A is notified', async ({ browser }) => {
  // Two browser contexts so each user has their own session storage.
  const ctxA = await browser.newContext()
  const pageA = await ctxA.newPage()
  const A = await signup(pageA, uniqueEmail('alice'))

  const ctxB = await browser.newContext()
  const pageB = await ctxB.newPage()
  const B = await signup(pageB, uniqueEmail('bob'))

  // A creates a report addressed to B and submits it.
  const created = await pageA.request.post(`${API_BASE}/reports`, {
    headers: apiHeaders(A.accessToken),
    data: {
      title: `Cross-user report ${Date.now()}`,
      purpose: 'cross-user e2e',
      approver_email: B.email,
    },
  })
  expect(created.status(), await created.text()).toBeLessThan(300)
  const createdBody = (await created.json()) as { id: string }

  const submitted = await pageA.request.post(`${API_BASE}/reports/${createdBody.id}/submit`, {
    headers: apiHeaders(A.accessToken),
    data: { approver_email: B.email },
  })
  expect(submitted.status(), await submitted.text()).toBeLessThan(300)

  // B's approval queue must contain the new report.
  const queue = await getJSON<Array<{ id: string }>>(
    pageB.request,
    `${API_BASE}/approvals/pending`,
    B.accessToken,
  )
  const inQueue = queue.find((q) => q.id === createdBody.id)
  expect(
    inQueue,
    `B's queue should contain the report; got ${JSON.stringify(queue.map((q) => q.id))}`,
  ).toBeTruthy()

  // B approves the report.
  const approveRes = await pageB.request.post(`${API_BASE}/approvals/${createdBody.id}/approve`, {
    headers: apiHeaders(B.accessToken),
    data: {},
  })
  expect(approveRes.status()).toBeLessThan(300)

  // A sees status flipped to 'approved' on the report.
  const reread = (await getJSON(
    pageA.request,
    `${API_BASE}/reports/${createdBody.id}`,
    A.accessToken,
  )) as { status: string }
  expect(reread.status).toBe('approved')

  // A's notifications include the approval.
  const notifs = (await getJSON(
    pageA.request,
    `${API_BASE}/notifications`,
    A.accessToken,
  )) as Array<{ type: string; reportId?: string }>
  const approvedNotif = notifs.find((n) => n.type === 'approved' && n.reportId === createdBody.id)
  expect(approvedNotif, 'A should have an "approved" notification').toBeTruthy()

  // Belt-and-suspenders: A walks to /reports?id= and sees the approved badge.
  await pageA.goto(`${APP_BASE}/reports?id=${createdBody.id}`)
  await pageA.waitForLoadState('networkidle')
  // The ApprovalBadge component renders the status text; just assert the
  // word "approved" appears anywhere on the page.
  await expect(pageA.locator('body')).toContainText(/approved/i, { timeout: 5000 })

  await ctxA.close()
  await ctxB.close()
})
