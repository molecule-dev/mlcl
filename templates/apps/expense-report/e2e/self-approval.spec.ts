/**
 * Segregation-of-duties / self-approval guard (security regression).
 *
 * `approver_id` is client-controlled. Before the fix a submitter could name
 * their OWN user id as the report's approver — directly via the create/update
 * body, or in the `/submit` body (which bypassed the email-resolution
 * self-check) — landing the report in their own `/approvals` queue and then
 * self-approving it. That defeats the entire approval workflow.
 *
 * Invariants asserted here:
 *   1. POST /reports with approver_id = self → 400 (cannot self-name at create).
 *   2. POST /reports/:id/submit with approver_id = self → 400 (the core vector).
 *   3. A self-named report never appears in the submitter's own /approvals queue.
 *   4. A legitimate cross-user submit (approver != submitter) still works — the
 *      fix blocks ONLY the unauthorized self-approval path.
 */
import { test, expect, type APIRequestContext } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

async function getJSON<T>(req: APIRequestContext, url: string, token: string): Promise<T> {
  const res = await req.get(url, { headers: apiHeaders(token) })
  expect(res.status(), await res.text()).toBeLessThan(400)
  return (await res.json()) as T
}

test('submitter cannot name themselves approver or self-approve', async ({ browser }) => {
  const ctxA = await browser.newContext()
  const pageA = await ctxA.newPage()
  const A = await signup(pageA, uniqueEmail('selfapprove'))
  expect(A.userId, 'signup must return the user id').toBeTruthy()
  const selfId = A.userId as string

  // 1. Cannot name self as approver at create time.
  const createSelf = await pageA.request.post(`${API_BASE}/reports`, {
    headers: apiHeaders(A.accessToken),
    data: {
      title: `Self-approver create ${Date.now()}`,
      purpose: 'self-approval e2e',
      approver_id: selfId,
    },
    failOnStatusCode: false,
  })
  expect(createSelf.status(), await createSelf.text()).toBe(400)

  // Create a legitimate draft report (no approver yet).
  const created = await pageA.request.post(`${API_BASE}/reports`, {
    headers: apiHeaders(A.accessToken),
    data: { title: `Self-approval target ${Date.now()}`, purpose: 'self-approval e2e' },
    failOnStatusCode: false,
  })
  expect(created.status(), await created.text()).toBeLessThan(300)
  const { id } = (await created.json()) as { id: string }

  // 2. The core vector: submit naming self as approver via the body → 400.
  const submitSelf = await pageA.request.post(`${API_BASE}/reports/${id}/submit`, {
    headers: apiHeaders(A.accessToken),
    data: { approver_id: selfId },
    failOnStatusCode: false,
  })
  expect(submitSelf.status(), await submitSelf.text()).toBe(400)

  // 3. The report must never have entered the submitter's own approval queue.
  const queue = await getJSON<Array<{ id: string }>>(
    pageA.request,
    `${API_BASE}/approvals/pending`,
    A.accessToken,
  )
  expect(
    queue.find((q) => q.id === id),
    'a self-named report must not appear in the submitter own queue',
  ).toBeFalsy()

  // Belt-and-suspenders: even if a self-approver row somehow existed, the
  // approve endpoint refuses when the approving user is the submitter.
  const approveOwn = await pageA.request.post(`${API_BASE}/approvals/${id}/approve`, {
    headers: apiHeaders(A.accessToken),
    data: {},
    failOnStatusCode: false,
  })
  // 404 (not their approver) or 403 (self-review blocked) — never a success.
  expect(approveOwn.status(), await approveOwn.text()).toBeGreaterThanOrEqual(400)

  // 4. Legitimate cross-user flow is unaffected: B can be named + approve.
  const ctxB = await browser.newContext()
  const pageB = await ctxB.newPage()
  const B = await signup(pageB, uniqueEmail('approver'))

  const submitToB = await pageA.request.post(`${API_BASE}/reports/${id}/submit`, {
    headers: apiHeaders(A.accessToken),
    data: { approver_email: B.email },
    failOnStatusCode: false,
  })
  expect(submitToB.status(), await submitToB.text()).toBeLessThan(300)

  const approveB = await pageB.request.post(`${API_BASE}/approvals/${id}/approve`, {
    headers: apiHeaders(B.accessToken),
    data: {},
    failOnStatusCode: false,
  })
  expect(approveB.status(), await approveB.text()).toBeLessThan(300)

  await ctxA.close()
  await ctxB.close()
})
