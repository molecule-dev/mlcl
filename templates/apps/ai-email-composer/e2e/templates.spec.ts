import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface TemplateRow {
  id: string
  name: string
  description: string
  subject: string
  body: string
  category: string
  variables?: unknown
}

test('POST /templates persists, GET /templates lists it', async ({ page }) => {
  await signup(page)
  const name = 'Sales kickoff ' + Date.now()
  const created = await apiPost<TemplateRow>(page, '/templates', {
    name,
    description: 'For B2B SaaS first-touch outreach',
    subject: 'Quick intro · {{company}}',
    body: 'Hi {{recipient}},\n\nLove what your team is doing at {{company}}.',
    category: 'sales',
    variables: ['company', 'recipient'],
  })
  expect(created.status).toBe(201)
  expect(created.body?.name).toBe(name)

  const list = await apiGet<TemplateRow[]>(page, '/templates')
  expect(list.status).toBe(200)
  expect(list.body?.find((t) => t.id === created.body!.id)).toBeTruthy()
})

test('PUT /templates/:id updates name', async ({ page }) => {
  await signup(page)
  const created = await apiPost<TemplateRow>(page, '/templates', {
    name: 'orig',
    description: '',
    subject: 'orig subject',
    body: 'orig body',
    category: 'sales',
    variables: [],
  })
  expect(created.status).toBe(201)
  const id = created.body!.id

  const r = await page.request.put(
    'http://localhost:' + (process.env.API_PORT || '4000') + '/api/templates/' + id,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
      data: { name: 'renamed' },
    },
  )
  expect(r.status()).toBe(200)
  const after = await apiGet<TemplateRow>(page, `/templates/${id}`)
  expect(after.body?.name).toBe('renamed')
})

test('DELETE /templates/:id removes it', async ({ page }) => {
  await signup(page)
  const created = await apiPost<TemplateRow>(page, '/templates', {
    name: 'doomed template',
    description: '',
    subject: 's',
    body: 'b',
    category: 'sales',
    variables: [],
  })
  expect(created.status).toBe(201)
  const id = created.body!.id
  const r = await page.request.delete(
    'http://localhost:' + (process.env.API_PORT || '4000') + '/api/templates/' + id,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
    },
  )
  expect(r.status()).toBe(204)
  const after = await apiGet(page, `/templates/${id}`)
  expect(after.status).toBe(404)
})

test('POST /templates/:id/render performs handlebars substitution', async ({ page }) => {
  await signup(page)
  const tpl = await apiPost<TemplateRow>(page, '/templates', {
    name: 'render test',
    description: '',
    subject: 'Welcome to {{company}}',
    body: 'Hi {{recipient}}, your renewal is due on {{date}}.',
    category: 'sales',
    variables: ['company', 'recipient', 'date'],
  })
  expect(tpl.status).toBe(201)

  const rendered = await apiPost<{
    subject: string
    body: string
    templateId: string
    templateName: string
  }>(page, `/templates/${tpl.body!.id}/render`, {
    variables: { company: 'Acme Co', recipient: 'Sarah', date: '2026-12-31' },
  })
  expect(rendered.status).toBe(200)
  expect(rendered.body?.subject).toBe('Welcome to Acme Co')
  expect(rendered.body?.body).toContain('Hi Sarah')
  expect(rendered.body?.body).toContain('2026-12-31')

  // Read-after-write: last_used_at should be populated after a render
  const after = await apiGet<TemplateRow & { last_used_at?: string | null }>(
    page,
    `/templates/${tpl.body!.id}`,
  )
  expect(after.body?.last_used_at).toBeTruthy()
})

test('Templates page UI: New + Save creates a template visible in the list', async ({ page }) => {
  await signup(page)
  await page.goto('/templates')
  await page
    .getByRole('button', { name: /new template/i })
    .first()
    .click()
  const uniqueName = 'UI Created ' + Date.now()
  await page.locator('[data-mol-id="templates-form-name"]').fill(uniqueName)
  await page.locator('[data-mol-id="templates-form-subject"]').fill('Hi')
  await page.locator('[data-mol-id="templates-form-body"]').fill('Body content')
  await page.locator('[data-mol-id="templates-form-save"]').click()
  // The modal should close and the new template appear in the grid
  await expect(page.locator('[data-mol-id="templates-modal"]')).toHaveCount(0, { timeout: 10_000 })
  await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 10_000 })
})
