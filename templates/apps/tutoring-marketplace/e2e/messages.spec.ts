/**
 * /messages — direct-message threads.
 * Asserts a thread is created via ?with=…, sending a message persists
 * (read-after-write through GET /api/messages/threads/:id/messages),
 * a non-participant cannot read a thread, and reload retains messages.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiFetch,
  captureNetwork,
  getAccessToken,
  signup,
  uniqueEmail,
} from './_helpers.js'

async function createPeer(browser: any): Promise<{ id: string; email: string }> {
  const ctx = await browser.newContext()
  const p = await ctx.newPage()
  await signup(p, uniqueEmail('peer'))
  // Pull the user id out of /api/users/.. — easier: sign in and read whoami via
  // the auth token (decode JWT or call any auth endpoint). Use evaluate to read
  // the id from localStorage if present, else decode the JWT payload.
  const tok = await getAccessToken(p)
  const id = tok
    ? (() => {
        try {
          const payload = JSON.parse(
            atob((tok.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')),
          )
          return payload.userId ?? payload.sub ?? ''
        } catch {
          return ''
        }
      })()
    : ''
  await ctx.close()
  return { id: String(id), email: '' }
}

test('messages page renders empty state when no threads', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/messages')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(page.getByText(/No threads yet|loading threads/i).first()).toBeVisible()
})

test('?with=<userId> creates a thread and selects it', async ({ page, browser }) => {
  const peer = await createPeer(browser)
  expect(peer.id).toBeTruthy()
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/messages?with=' + peer.id)
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const post = reqs.find((r) => r.method === 'POST' && /\/api\/messages\/threads(\?|$)/.test(r.url))
  expect(
    post?.status === 201 || post?.status === 200,
    `thread create status ${post?.status}`,
  ).toBeTruthy()

  // Send a message
  await page.locator('input[type="text"]').first().fill('Hello there')
  const sendReqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /send message/i })
      .first()
      .click()
    await page.waitForTimeout(2_000)
  })
  const sendPost = sendReqs.find(
    (r) => r.method === 'POST' && /\/api\/messages\/threads\/[^/]+\/messages/.test(r.url),
  )
  expect(sendPost?.status).toBe(201)
})

test('sent message is visible after a reload (read-after-write)', async ({ page, browser }) => {
  const peer = await createPeer(browser)
  await signup(page)
  await page.goto(APP_BASE + '/messages?with=' + peer.id)
  await page.waitForLoadState('networkidle', { timeout: 15_000 })

  const body = `persist-test-${Date.now()}`
  await page.locator('input[type="text"]').first().fill(body)
  await page
    .getByRole('button', { name: /send message/i })
    .first()
    .click()
  await page.waitForTimeout(1_500)

  await page.reload()
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const html = await page.content()
  expect(html).toContain(body)
})

test('non-participant cannot fetch a thread by id', async ({ page, browser }) => {
  // user A starts a thread with peer
  const peer = await createPeer(browser)
  const ctxA = await browser.newContext()
  const pa = await ctxA.newPage()
  await signup(pa)
  const create = await apiFetch<{ id: string }>(pa, 'POST', '/messages/threads', {
    recipient_id: peer.id,
  })
  expect(create.status === 200 || create.status === 201).toBeTruthy()
  const threadId = create.body?.id
  expect(threadId).toBeTruthy()
  await ctxA.close()

  // user B (unrelated) tries to read
  await signup(page)
  const r = await apiFetch(page, 'GET', `/messages/threads/${threadId}/messages`)
  expect([403, 404]).toContain(r.status)
})

test('cannot start a thread with yourself', async ({ page }) => {
  await signup(page)
  // get my id from JWT
  const jwt = await getAccessToken(page)
  const id = jwt
    ? (() => {
        try {
          const payload = JSON.parse(
            atob((jwt.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')),
          )
          return payload.userId ?? payload.sub ?? ''
        } catch {
          return ''
        }
      })()
    : ''
  const r = await apiFetch(page, 'POST', '/messages/threads', { recipient_id: String(id) })
  expect(r.status).toBe(400)
})

test('messages heading "Threads with your tutors." renders', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/messages')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  await expect(
    page.getByRole('heading', { name: /threads with your tutors|messages/i }).first(),
  ).toBeVisible({ timeout: 15_000 })
})
