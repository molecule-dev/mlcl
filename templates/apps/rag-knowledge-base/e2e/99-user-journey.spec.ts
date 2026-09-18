/**
 * 99-user-journey — kitchen-sink cross-page Engram flow.
 *
 * One real user signs up, uploads a document, asks a question that the
 * RAG pipeline retrieves + Anthropic answers, then confirms the
 * resulting state propagates to /history, /analytics, /graph, and
 * /notifications. Every assertion is on the rendered DOM AND the
 * round-tripped backend state — no mocks.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  API_BASE,
  APP_BASE,
  apiHeaders,
  ask,
  createDocument,
  createNotification,
  listHistory,
  listNotifications,
  signup,
} from './_helpers.js'

test('end-to-end: signup → upload → ask → history → analytics → graph → notifications', async ({
  page,
}) => {
  // 1. Sign up and land on /ask
  const session = await signup(page)
  expect(page.url()).toMatch(/\/ask/)

  // 2. Upload a document
  const doc = await createDocument(page, session.accessToken, {
    title: 'User journey doc',
    body_md:
      'The user journey verification document explains everything about the policy in question.',
  })
  await page.goto(APP_BASE + '/documents')
  await expect(page.getByText('User journey doc')).toBeVisible()

  // 3. Ask a question; verify the answer block renders
  const question = 'What does the user journey doc say about the policy?'
  const entry = await ask(page, session.accessToken, question)
  expect(entry.id).toBeTruthy()

  await page.goto(APP_BASE + '/ask')
  await expect(page.locator('[data-testid="ask-recent"]')).toContainText(question, {
    timeout: 10_000,
  })

  // 4. /history reflects the new entry
  await page.goto(APP_BASE + '/history')
  await expect(page.locator(`[data-testid="history-row-${entry.id}"]`)).toBeVisible()
  const historyAfter = await listHistory(page, session.accessToken)
  expect(historyAfter.some((e) => e.id === entry.id)).toBe(true)

  // 5. /analytics reflects 1 question today + 1 top doc
  await page.goto(APP_BASE + '/analytics')
  const totals = await page.request.get(`${API_BASE}/reports/analytics`, {
    headers: apiHeaders(session.accessToken),
  })
  expect(totals.status()).toBe(200)
  const totalsBody = (await totals.json()) as {
    questions_today: number
    top_docs: Array<{ id: string }>
  }
  expect(totalsBody.questions_today).toBeGreaterThanOrEqual(1)
  expect(totalsBody.top_docs.some((d) => d.id === doc.id)).toBe(true)

  // 6. /graph renders the doc as a node
  await page.goto(APP_BASE + '/graph')
  await expect(page.locator(`[data-testid="graph-node-${doc.id}"]`)).toBeVisible({
    timeout: 10_000,
  })

  // 7. /notifications round-trips a real notification (mark-read + dismiss)
  const note = await createNotification(page, session.accessToken, {
    title: 'User journey notification',
    body: 'A round-trip across the notifications surface.',
  })
  await page.goto(APP_BASE + '/notifications')
  await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toBeVisible()
  await page.locator(`[data-testid="notifications-mark-read-${note.id}"]`).click()
  await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toHaveAttribute(
    'data-unread',
    '0',
  )
  await page.locator(`[data-testid="notifications-dismiss-${note.id}"]`).click()
  await expect(page.locator(`[data-testid="notifications-row-${note.id}"]`)).toHaveCount(0)

  const notesLeft = await listNotifications(page, session.accessToken)
  expect(notesLeft.some((n) => n.id === note.id)).toBe(false)
})
