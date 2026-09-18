/**
 * Per-page spec for /inbox. Verifies the read-after-write contract for
 * tab filters, star toggle, reading-pane actions (archive/delete/spam),
 * and the inline reply quick-compose.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, listEmails, signup } from './_helpers.js'

test('GET /inbox renders the thread list and tab bar', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[data-mol-id="inbox-tab-primary"]')).toBeVisible()
  await expect(page.locator('[data-mol-id="inbox-thread-list"]')).toBeVisible()
})

test('Inbox fetches /api/emails?folder=inbox on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/inbox')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.some((r) => /\/api\/emails\?[^"]*folder=inbox/.test(r.url) && r.status === 200)).toBe(
    true,
  )
})

test('Star toggle flips is_starred via PUT /api/emails/:id/star', async ({ page }) => {
  const { accessToken } = await signup(page)
  const before = await listEmails(page, accessToken, { folder: 'inbox', limit: 20 })

  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')

  // Pick the target from what is ON SCREEN, not from the API. The inbox splits
  // its rows across Primary/Social/Promotions/Updates tabs and defaults to
  // Primary, so an email the API returns for folder=inbox may not be rendered —
  // choosing by API order used to select an Updates row and time out.
  // Each thread row is a <div role="button"> containing a nested star
  // <button aria-label="Add star|Remove star"> that stops propagation.
  const starSpan = page.getByRole('button', { name: /add star|remove star/i }).first()
  await expect(starSpan).toBeVisible()

  const reqs = await captureNetwork(page, async () => {
    await starSpan.click()
    await page.waitForTimeout(800)
  })
  const starReq = reqs.find(
    (r) => /\/api\/emails\/[^/]+\/star$/.test(r.url) && r.status >= 200 && r.status < 300,
  )
  expect(starReq, 'PUT /api/emails/:id/star must be observed').toBeTruthy()

  // The id in the request tells us exactly which row was starred, so the
  // read-after-write check needs no guess about ordering.
  const starredId = /\/api\/emails\/([^/]+)\/star$/.exec(starReq!.url)?.[1]
  expect(starredId, 'star request must carry an email id').toBeTruthy()
  const wasStarred = before.find((e) => e.id === starredId)?.is_starred ?? false

  const after = await listEmails(page, accessToken, { folder: 'inbox', limit: 20 })
  const updated = after.find((e) => e.id === starredId)
  expect(updated?.is_starred).toBe(!wasStarred)
})

test('Reading-pane archive moves the email out of inbox', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  const initial = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = initial[0]
  expect(target).toBeTruthy()
  // select first row, then click archive
  await page
    .locator('[data-mol-id="inbox-thread-list"] >> nth=0')
    .click()
    .catch(() => undefined)
  // Click first thread row
  const rows = page.locator(
    '[data-mol-id="inbox-thread-list"] [role="button"], [data-mol-id="inbox-thread-list"] button',
  )
  if ((await rows.count()) > 0) await rows.first().click()
  await page.locator('[data-mol-id="reading-archive"]').click()
  await page.waitForTimeout(1000)
  const archived = await listEmails(page, accessToken, { folder: 'archive', limit: 50 })
  expect(archived.find((e) => e.id === target!.id)).toBeTruthy()
})

test('Reading-pane reply posts to /api/emails/send and appears in /sent', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  // open the first row's reading pane
  const rows = page.locator(
    '[data-mol-id="inbox-thread-list"] button, [data-mol-id="inbox-thread-list"] [role="button"]',
  )
  if ((await rows.count()) > 0) await rows.first().click()
  const replyArea = page.locator('[data-mol-id="reading-reply-textarea"]')
  await expect(replyArea).toBeVisible()
  await replyArea.fill('Inbox spec inline reply.')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('[data-mol-id="reading-send-reply"]').click()
    await page.waitForTimeout(2000)
  })
  expect(
    reqs.some((r) => /\/api\/emails\/send$/.test(r.url) && r.status >= 200 && r.status < 300),
  ).toBe(true)
  const sent = await listEmails(page, accessToken, { folder: 'sent', limit: 50 })
  const reply = sent.find((e) => /^Re:/.test(e.subject ?? ''))
  expect(reply).toBeTruthy()
})

test('Inbox tab buttons toggle the active filter', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  await page.locator('[data-mol-id="inbox-tab-social"]').click()
  await expect(page.locator('[data-mol-id="inbox-tab-social"]')).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.locator('[data-mol-id="inbox-tab-primary"]').click()
  await expect(page.locator('[data-mol-id="inbox-tab-primary"]')).toHaveAttribute(
    'aria-selected',
    'true',
  )
})

test('Reading-pane spam button moves the email out of inbox into /spam', async ({ page }) => {
  const { accessToken } = await signup(page)
  await page.goto(APP_BASE + '/inbox')
  await page.waitForLoadState('networkidle')
  const inbox = await listEmails(page, accessToken, { folder: 'inbox', limit: 5 })
  const target = inbox[0]
  expect(target).toBeTruthy()
  const rows = page.locator(
    '[data-mol-id="inbox-thread-list"] button, [data-mol-id="inbox-thread-list"] [role="button"]',
  )
  if ((await rows.count()) > 0) await rows.first().click()
  await page.locator('[data-mol-id="reading-spam"]').click()
  await page.waitForTimeout(1000)
  const spam = await listEmails(page, accessToken, { folder: 'spam', limit: 50 })
  expect(spam.find((e) => e.id === target!.id)).toBeTruthy()
})
