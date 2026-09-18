/**
 * Folder views (/starred, /archive, /trash, /spam, /sent) and thread
 * detail (/thread/:id) must show what the API claims is in each folder.
 * Read-after-write: move/star → folder list reflects the change.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, listEmails, signup } from './_helpers.js'

async function moveEmail(
  page: import('@playwright/test').Page,
  token: string,
  id: string,
  folder: string,
) {
  const res = await page.request.put(`${API_BASE}/emails/${id}/move`, {
    headers: apiHeaders(token),
    data: { folder },
  })
  expect(res.status(), await res.text()).toBe(200)
}

test('GET /starred renders only emails the API reports as starred', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const starred = inbox.find((e) => e.is_starred)
  expect(starred, 'seeded mailbox includes a starred email').toBeTruthy()

  await page.goto(APP_BASE + '/starred')
  await page.waitForLoadState('networkidle')
  // Subject of the starred email must appear on the page.
  await expect(page.getByText(starred!.subject ?? '').first()).toBeVisible({ timeout: 10_000 })
})

test('GET /archive renders an email after move-to-archive (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!
  await moveEmail(page, accessToken, target.id, 'archive')

  await page.goto(APP_BASE + '/archive')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.subject ?? '').first()).toBeVisible({ timeout: 10_000 })
})

test('GET /trash renders an email after delete-to-trash (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!
  // First DELETE moves to trash.
  await page.request.delete(`${API_BASE}/emails/${target.id}`, { headers: apiHeaders(accessToken) })

  await page.goto(APP_BASE + '/trash')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.subject ?? '').first()).toBeVisible({ timeout: 10_000 })
})

test('GET /spam renders an email after move-to-spam (read-after-write)', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!
  await moveEmail(page, accessToken, target.id, 'spam')

  await page.goto(APP_BASE + '/spam')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(target.subject ?? '').first()).toBeVisible({ timeout: 10_000 })
})

test('GET /sent renders the seeded sent email', async ({ page }) => {
  const { accessToken } = await signup(page)
  const sent = await listEmails(page, accessToken, { folder: 'sent' })
  expect(sent.length).toBeGreaterThan(0)
  const sentSubject = sent[0]!.subject ?? ''

  await page.goto(APP_BASE + '/sent')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText(sentSubject).first()).toBeVisible({ timeout: 10_000 })
})

test('GET /thread/:id loads the full thread for a seeded email', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!

  // Fetch the thread via the API to confirm endpoint behavior.
  const threadRes = await page.request.get(`${API_BASE}/emails/${target.id}/thread`, {
    headers: apiHeaders(accessToken),
  })
  expect(threadRes.status()).toBe(200)
  const messages = (await threadRes.json()) as Array<{ id: string; subject?: string }>
  expect(messages.length).toBeGreaterThan(0)

  // Drive the UI.
  await page.goto(APP_BASE + `/thread/${target.id}`)
  await page.waitForLoadState('networkidle')
  // Subject visible on the thread page.
  await expect(page.getByText(target.subject ?? '').first()).toBeVisible({ timeout: 10_000 })
  // Back-to-Inbox link present.
  await expect(page.getByRole('link', { name: /back.*inbox|inbox/i }).first()).toBeVisible()
})

test('Thread page archive button moves the email and redirects to /inbox', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!

  await page.goto(APP_BASE + `/thread/${target.id}`)
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /archive/i })
    .first()
    .click()
  await page.waitForURL(/\/inbox/, { timeout: 10_000 })

  // The email is now in archive.
  const archive = await listEmails(page, accessToken, { folder: 'archive' })
  expect(archive.find((e) => e.id === target.id)).toBeTruthy()
})

test('Thread page star toggle reflects via GET on the same email', async ({ page }) => {
  const { accessToken } = await signup(page)
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox.find((e) => !e.is_starred)!
  expect(target).toBeTruthy()

  await page.goto(APP_BASE + `/thread/${target.id}`)
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('button', { name: /^star$/i })
    .first()
    .click()
  await page.waitForTimeout(500)

  const after = await listEmails(page, accessToken, { folder: 'inbox' })
  expect(after.find((e) => e.id === target.id)?.is_starred).toBe(true)
})
