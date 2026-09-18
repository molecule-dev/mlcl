/**
 * Kitchen-sink user-journey: a real user signs up, sees their seeded
 * mailbox, opens a thread, composes a message, drafts another, applies
 * a label, archives one, deletes another, and then signs out and back
 * in. Every leg verifies a backend invariant via a follow-up GET.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, listEmails, login, signup } from './_helpers.js'

test.setTimeout(120_000)

test('full user journey: signup → inbox → compose → draft → label → archive → delete → reset session', async ({
  page,
}) => {
  const { accessToken, email, password } = await signup(page)

  // Seeded mailbox renders.
  await page.goto(APP_BASE + '/inbox')
  await expect(page.getByText(/Sarah Jenkins/i).first()).toBeVisible({ timeout: 10_000 })

  // Open a thread.
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!
  await page.goto(APP_BASE + `/thread/${target.id}`)
  await expect(page.getByText(target.subject ?? '').first()).toBeVisible()

  // Compose a new email via the UI.
  await page.goto(APP_BASE + '/compose')
  await page
    .locator('input[placeholder="Add another recipient"]')
    .fill('journey-recipient@example.com')
  await page.locator('input[placeholder="Add another recipient"]').press('Enter')
  await page.locator('input[placeholder="Subject"]').fill('Journey-test send')
  await page
    .locator('textarea[placeholder="Write your message…"]')
    .fill('From the kitchen-sink journey.')
  await page.getByRole('button', { name: /^Send$/ }).click()
  await page.waitForURL(/\/(inbox|sent)/, { timeout: 15_000 })
  const sent = await listEmails(page, accessToken, { folder: 'sent' })
  expect(sent.find((e) => e.subject === 'Journey-test send')).toBeTruthy()

  // Save a draft via API directly (compose UI redirects after Send only).
  const draftRes = await page.request.post(`${API_BASE}/drafts`, {
    headers: apiHeaders(accessToken),
    data: { subject: 'Journey draft', body: 'still composing', to: ['x@y.test'] },
  })
  expect(draftRes.status()).toBe(201)
  const drafts = await page.request
    .get(`${API_BASE}/drafts`, { headers: apiHeaders(accessToken) })
    .then((r) => r.json() as Promise<Array<{ subject?: string }>>)
  expect(drafts.find((d) => d.subject === 'Journey draft')).toBeTruthy()

  // Create a custom label and apply it to one inbox email.
  const newLabel = await page.request
    .post(`${API_BASE}/labels`, {
      headers: apiHeaders(accessToken),
      data: { name: 'Journey', color: '#ff8800' },
    })
    .then((r) => r.json() as Promise<{ id: string }>)
  await page.request.post(`${API_BASE}/labels/${newLabel.id}/emails/${target.id}`, {
    headers: apiHeaders(accessToken),
  })
  const labelled = await page.request
    .get(`${API_BASE}/emails/${target.id}`, { headers: apiHeaders(accessToken) })
    .then((r) => r.json() as Promise<{ label_ids?: string[]; labels?: string[] }>)
  const labelIds = (labelled.label_ids ?? labelled.labels ?? []) as string[]
  expect(
    labelIds.includes(newLabel.id) || JSON.stringify(labelled).includes(newLabel.id),
  ).toBeTruthy()

  // Archive a different inbox email.
  const second = inbox[1]!
  await page.request.put(`${API_BASE}/emails/${second.id}/move`, {
    headers: apiHeaders(accessToken),
    data: { folder: 'archive' },
  })
  const archive = await listEmails(page, accessToken, { folder: 'archive' })
  expect(archive.find((e) => e.id === second.id)).toBeTruthy()

  // Delete a third inbox email (soft delete to trash).
  const third = inbox[2]!
  await page.request.delete(`${API_BASE}/emails/${third.id}`, { headers: apiHeaders(accessToken) })
  const trash = await listEmails(page, accessToken, { folder: 'trash' })
  expect(trash.find((e) => e.id === third.id)).toBeTruthy()

  // Sign out → /login redirects, then sign back in and assert /inbox loads.
  await page.goto(APP_BASE + '/settings')
  await page.locator('[data-mol-id="settings-section-security"]').click()
  await page.locator('[data-mol-id="settings-sign-out"]').click()
  await page.waitForURL(/\/login/, { timeout: 10_000 })
  await login(page, email, password)
  await expect(page).toHaveURL(/\/inbox/)
})
