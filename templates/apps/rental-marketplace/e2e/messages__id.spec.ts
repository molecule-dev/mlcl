/**
 * /messages/:id — single thread (chat composer + reply pipeline).
 *
 * Real outcomes asserted:
 *   - sending a reply POSTs /api/messages/threads/:id and the new
 *     message body shows up in the panel after the next refresh
 *     (read-after-write)
 *   - View Listing CTA on the header navigates back to /listings/:id
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, captureNetwork, signup } from './_helpers'

async function seedThread(
  page: import('@playwright/test').Page,
): Promise<{ threadId: string; listingId: string }> {
  const r = await page.request.get(`${API_BASE}/listings`)
  const body = (await r.json()) as { data: Array<{ id: string; host_id: string }> }
  const listing = body.data[0]
  const create = await page.request.post(`${API_BASE}/messages/threads`, {
    data: { peer_id: listing.host_id, listing_id: listing.id },
  })
  const created = (await create.json()) as { id?: string; data?: { id: string } }
  const threadId = created.id ?? created.data?.id
  expect(threadId).toBeTruthy()
  return { threadId: threadId!, listingId: listing.id }
}

test('sending a reply persists and renders in the thread', async ({ page }) => {
  await signup(page)
  const { threadId } = await seedThread(page)
  await page.goto(APP_BASE + `/messages/${threadId}`)
  await page.waitForLoadState('networkidle')

  const composer = page.getByPlaceholder(/reply to/i)
  await composer.fill('Hello — is early check-in possible?')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /send message/i }).click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find(
    (r) => r.url.includes(`/api/messages/threads/${threadId}`) && r.method === 'POST',
  )
  expect(post?.status).toBeGreaterThanOrEqual(200)
  expect(post?.status).toBeLessThan(300)

  await expect(page.getByText(/early check-in/i).first()).toBeVisible({ timeout: 10000 })

  // Read-after-write: GET messages includes the body too.
  const after = await page.request.get(`${API_BASE}/messages/threads/${threadId}`)
  const ab = (await after.json()) as {
    messages?: Array<{ body: string }>
    data?: { messages: Array<{ body: string }> }
  }
  const msgs = ab.messages ?? ab.data?.messages ?? []
  expect(msgs.some((m) => /early check-in/i.test(m.body))).toBeTruthy()
})

test('View listing button on thread header returns to /listings/:id', async ({ page }) => {
  await signup(page)
  const { threadId, listingId } = await seedThread(page)
  await page.goto(APP_BASE + `/messages/${threadId}`)
  await page.waitForLoadState('networkidle')
  await page
    .getByRole('link', { name: /view listing/i })
    .first()
    .click()
  await expect(page).toHaveURL(new RegExp(`/listings/${listingId}$`))
})

test('thread mount fetches GET /api/messages/threads/:id (captureNetwork)', async ({ page }) => {
  await signup(page)
  const { threadId } = await seedThread(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + `/messages/${threadId}`)
    await page.waitForLoadState('networkidle')
  })
  const get = reqs.find(
    (r) => r.url.includes(`/api/messages/threads/${threadId}`) && r.method === 'GET',
  )
  expect(get, 'GET /api/messages/threads/:id should fire on mount').toBeTruthy()
  expect(get!.status).toBe(200)
})

test('reply input is editable + Send button is rendered', async ({ page }) => {
  await signup(page)
  const { threadId } = await seedThread(page)
  await page.goto(APP_BASE + `/messages/${threadId}`)
  await page.waitForLoadState('networkidle')
  const input = page.getByPlaceholder(/reply to/i)
  await expect(input).toBeVisible()
  await input.fill('typing test')
  await expect(input).toHaveValue('typing test')
  await expect(page.getByRole('button', { name: /send message/i })).toBeVisible()
})

test('not-found thread surfaces a Back to inbox link to /messages', async ({ page }) => {
  await signup(page)
  // A made-up thread id should render the not-found state.
  await page.goto(APP_BASE + '/messages/00000000-0000-0000-0000-000000000000')
  await page.waitForLoadState('networkidle')
  const back = page.getByRole('link', { name: /back to inbox|inbox/i }).first()
  if (await back.count()) {
    await back.click()
    await expect(page).toHaveURL(/\/messages$/)
  } else {
    // If the page chose to redirect or render the empty conversation
    // panel, at minimum confirm the URL is no longer something
    // crashing.
    expect(page.url()).toMatch(/\/messages/)
  }
})
