import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface DraftRow {
  id: string
  subject: string
  body: string
  recipients: unknown
  status: string
  user_id: string
  ai_generated?: boolean
  tone?: string | null
}

test('POST /drafts creates a row, GET /drafts/:id returns it', async ({ page }) => {
  await signup(page)
  const subject = 'Test draft ' + Date.now()
  const created = await apiPost<DraftRow>(page, '/drafts', {
    subject,
    body: 'Hello team,\n\nQuick update.',
    recipients: ['friend@example.com'],
  })
  expect(created.status).toBe(201)
  expect(created.body?.id).toBeTruthy()
  expect(created.body?.subject).toBe(subject)

  const fetched = await apiGet<DraftRow>(page, `/drafts/${created.body!.id}`)
  expect(fetched.status).toBe(200)
  expect(fetched.body?.subject).toBe(subject)
  expect(fetched.body?.body).toContain('Quick update')
})

test('PUT /drafts/:id round-trips the new subject and body', async ({ page }) => {
  await signup(page)
  const initial = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'orig',
    body: 'orig body',
    recipients: ['x@example.com'],
  })
  expect(initial.status).toBe(201)

  const updated = await page.request.put(
    'http://localhost:' + (process.env.API_PORT || '4000') + '/api/drafts/' + initial.body!.id,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
      data: { subject: 'updated subj', body: 'updated body' },
    },
  )
  expect(updated.status()).toBe(200)
  const after = await apiGet<DraftRow>(page, `/drafts/${initial.body!.id}`)
  expect(after.body?.subject).toBe('updated subj')
  expect(after.body?.body).toBe('updated body')
})

test('DELETE /drafts/:id removes from the list', async ({ page }) => {
  await signup(page)
  const created = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'to delete',
    body: 'doomed',
    recipients: ['z@example.com'],
  })
  expect(created.status).toBe(201)
  const id = created.body!.id

  const delResp = await page.request.delete(
    'http://localhost:' + (process.env.API_PORT || '4000') + '/api/drafts/' + id,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
    },
  )
  expect(delResp.status()).toBe(204)

  const fetched = await apiGet(page, `/drafts/${id}`)
  expect(fetched.status).toBe(404)
})

test('isolation: another user cannot read my draft', async ({ page, browser }) => {
  await signup(page)
  const created = await apiPost<DraftRow>(page, '/drafts', {
    subject: 'private',
    body: 'secret',
    recipients: ['secret@example.com'],
  })
  expect(created.status).toBe(201)

  const ctx = await browser.newContext()
  const p2 = await ctx.newPage()
  await signup(p2)
  const fetched = await apiGet(p2, `/drafts/${created.body!.id}`)
  expect(fetched.status).toBe(404)
  await ctx.close()
})

test('Compose page UI saves a draft via the Save button', async ({ page }) => {
  await signup(page)
  await page.goto('/compose')
  // Recipients chip input (type and press Enter)
  await page.locator('#compose-to').fill('friend@example.com')
  await page.locator('#compose-to').press('Enter')
  await page.locator('#compose-subject').fill('Saved via UI ' + Date.now())
  await page.locator('#compose-body').fill('Body via UI test.')
  await page.getByRole('button', { name: /save draft/i }).click()
  await expect(page.locator('[data-mol-id=compose-status]')).toBeVisible({ timeout: 10_000 })

  // Confirm a draft now exists for the user
  const list = await apiGet<DraftRow[]>(page, '/drafts')
  expect(list.status).toBe(200)
  expect(Array.isArray(list.body)).toBe(true)
  expect(list.body!.length).toBeGreaterThanOrEqual(1)
})
