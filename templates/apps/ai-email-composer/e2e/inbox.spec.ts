import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  status: string
  subject: string
}

test('Inbox folder switching: drafts folder shows new drafts, sent shows sent emails', async ({
  page,
}) => {
  test.setTimeout(60_000)
  await signup(page)

  // Seed: 1 draft (status=draft), 1 sent
  const draft1 = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Draft only ' + Date.now(),
    body: 'A draft that should appear in the Drafts folder.',
    recipients: ['drafttarget@example.com'],
  })
  expect(draft1.status).toBe(201)

  const draft2 = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'About to send ' + Date.now(),
    body: 'Will be sent.',
    recipients: ['senttarget@example.com'],
  })
  expect(draft2.status).toBe(201)
  const sent = await apiPost(page, `/drafts/${draft2.body!.id}/send`, {})
  expect(sent.status).toBe(200)

  // Drafts folder: contains the unsent draft.
  await page.goto('/inbox?folder=drafts')
  await expect(page.locator('[data-mol-id="inbox-folder-drafts"]')).toBeVisible({ timeout: 15_000 })
  // The draft list should include our subject. The reading pane subject is
  // the first item shown; assert by waiting for it to populate.
  await expect
    .poll(
      async () => {
        const text = await page
          .locator('[data-mol-id="inbox-subject"]')
          .textContent()
          .catch(() => null)
        return text ?? ''
      },
      { timeout: 15_000 },
    )
    .toContain('Draft only')

  // Sent folder: contains the sent draft.
  await page.goto('/inbox?folder=sent')
  await expect(page.locator('[data-mol-id="inbox-folder-sent"]')).toBeVisible({ timeout: 15_000 })
  await expect
    .poll(
      async () => {
        const text = await page
          .locator('[data-mol-id="inbox-subject"]')
          .textContent()
          .catch(() => null)
        return text ?? ''
      },
      { timeout: 15_000 },
    )
    .toContain('About to send')
})

test('Inbox empty state for a fresh user has the empty-folder message', async ({ page }) => {
  await signup(page)
  await page.goto('/inbox?folder=inbox')
  // Either inbox-empty (no items) or inbox-loading then empty. Wait for the
  // "Nothing here yet" affordance.
  await expect
    .poll(
      async () => {
        const visible = await page
          .locator('[data-mol-id="inbox-empty"]')
          .isVisible()
          .catch(() => false)
        return visible ? 'empty' : 'not-empty'
      },
      { timeout: 15_000 },
    )
    .toBe('empty')
})

test('Inbox folder click updates the URL and folder param', async ({ page }) => {
  await signup(page)
  await page.goto('/inbox')
  await page.locator('[data-mol-id="inbox-folder-drafts"]').first().click()
  await expect(page).toHaveURL(/folder=drafts/, { timeout: 10_000 })
  await page.locator('[data-mol-id="inbox-folder-sent"]').first().click()
  await expect(page).toHaveURL(/folder=sent/, { timeout: 10_000 })
  await page.locator('[data-mol-id="inbox-folder-archive"]').first().click()
  await expect(page).toHaveURL(/folder=archive/, { timeout: 10_000 })
})

test('Scheduled folder shows drafts with status=scheduled (round-tripped via API)', async ({
  page,
}) => {
  await signup(page)
  // Schedule via API since the UI doesn't expose a scheduler today.
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const draft = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'Scheduled ping ' + Date.now(),
    body: 'Will go out tomorrow.',
    recipients: ['delayed@example.com'],
    scheduled_at: future,
  })
  expect(draft.status).toBe(201)
  expect(draft.body?.status).toBe('scheduled')

  await page.goto('/inbox?folder=scheduled')
  await expect
    .poll(
      async () => {
        const text = await page
          .locator('[data-mol-id="inbox-subject"]')
          .textContent()
          .catch(() => null)
        return text ?? ''
      },
      { timeout: 15_000 },
    )
    .toContain('Scheduled ping')
})
