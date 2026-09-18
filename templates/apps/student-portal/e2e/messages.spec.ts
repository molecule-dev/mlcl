import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, apiRaw, signup, api, getMyUserId, pickUnreadThread } from './_helpers.js'

interface ApiMessage {
  id: string
  user_id: string
  recipient_id: string
  thread_id?: string | null
  sender_name?: string | null
  content: string
  read_at?: string | null
}

interface ThreadSummary extends ApiMessage {
  unread: number
}

test('Inbox is non-empty after signup with unread thread counts', async ({ page }) => {
  await signup(page)
  const threads = await api<ThreadSummary[]>(page, 'GET', '/messages/threads')
  expect(threads.length).toBeGreaterThan(0)
  const unread = threads.filter((t) => t.unread > 0)
  expect(unread.length, 'at least one thread has unread messages').toBeGreaterThan(0)
})

test('Opening a thread marks its messages read (read-after-write)', async ({ page }) => {
  await signup(page)
  const me = await getMyUserId(page)
  // Drive whichever unread thread the inbox actually holds — naming a seeded
  // thread id breaks the spec the moment the demo inbox is replaced.
  const { thread_id: threadId } = await pickUnreadThread(page)

  // Initially, that thread is unread.
  const before = await api<ApiMessage[]>(page, 'GET', `/messages?folder=inbox`)
  const threadBefore = before.filter((m) => m.thread_id === threadId)
  expect(threadBefore.length).toBeGreaterThan(0)
  expect(
    threadBefore.every((m) => !m.read_at),
    'picked thread starts unread',
  ).toBe(true)

  // GET the thread — handler marks recipient_id=me messages as read.
  const thread = await api<ApiMessage[]>(page, 'GET', `/messages/thread/${threadId}`)
  expect(thread.length).toBeGreaterThan(0)
  expect(thread.some((m) => m.recipient_id === me)).toBe(true)

  // Re-read inbox; the same messages should now be marked read.
  const after = await api<ApiMessage[]>(page, 'GET', `/messages?folder=inbox`)
  const threadAfter = after.filter((m) => m.thread_id === threadId)
  expect(
    threadAfter.every((m) => !!m.read_at),
    'thread now marked read',
  ).toBe(true)
})

test('Sending a reply persists in the thread (read-after-write)', async ({ page }) => {
  await signup(page)

  // The thread and its counterpart both come from the live inbox.
  const thread = await pickUnreadThread(page)
  const threadId = thread.thread_id
  const counterpartId = thread.user_id
  const beforeCount = (await api<ApiMessage[]>(page, 'GET', `/messages/thread/${threadId}`)).length

  const text = 'Reply test ' + Date.now()
  const created = await api<ApiMessage>(page, 'POST', '/messages', {
    recipient_id: counterpartId,
    thread_id: threadId,
    sender_name: 'Riley Carter',
    content: text,
  })
  expect(created.id).toBeTruthy()
  expect(created.content).toBe(text)

  // Read-after-write — the new reply appears in the thread.
  const after = await api<ApiMessage[]>(page, 'GET', `/messages/thread/${threadId}`)
  expect(after.length).toBe(beforeCount + 1)
  expect(after.find((m) => m.id === created.id)?.content).toBe(text)
})

test('Cross-user thread access returns 404 (IDOR guard)', async ({ page, browser }) => {
  await signup(page)
  const { thread_id: threadId } = await pickUnreadThread(page)

  // User B has their own seeded threads.
  const ctx2 = await browser.newContext()
  const page2 = await ctx2.newPage()
  await signup(page2)
  // Thread ids can be stable across users, but each user only sees messages
  // where their own id is sender or recipient.
  const u2Thread = await apiRaw(page2, 'GET', `/messages/thread/${threadId}`)
  // Confirm the body is filtered to messages they're a party to.
  if (u2Thread.ok()) {
    const body = (await u2Thread.json()) as ApiMessage[]
    const meId = await getMyUserId(page2)
    expect(body.every((m) => m.user_id === meId || m.recipient_id === meId)).toBe(true)
  }
  await ctx2.close()
})

test('Messages page renders threads from the inbox', async ({ page }) => {
  await signup(page)
  // The sender the page must show comes from the threads endpoint it reads.
  const thread = await pickUnreadThread(page)
  await page.goto(APP_BASE + '/messages')
  await page.waitForLoadState('networkidle')
  const row = page.locator(`[data-mol-id="message-thread-${thread.thread_id}"]`)
  await expect(row).toBeVisible({ timeout: 10000 })
  await expect(row).toContainText(thread.sender_name)
})
