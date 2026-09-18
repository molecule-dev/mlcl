import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiGet, apiPost, signup } from './_helpers.js'

interface ContactRow {
  id: string
  email: string
  name: string | null
  tags: unknown
}

test('POST /contacts creates, GET /contacts lists', async ({ page }) => {
  await signup(page)
  const created = await apiPost<ContactRow>(page, '/contacts', {
    email: 'newcontact@example.com',
    name: 'New Contact',
    tags: ['vip', 'q4'],
  })
  expect(created.status).toBe(201)
  expect(created.body?.email).toBe('newcontact@example.com')

  const list = await apiGet<ContactRow[]>(page, '/contacts')
  expect(list.status).toBe(200)
  expect(list.body?.find((c) => c.id === created.body!.id)).toBeTruthy()
})

test('POST /contacts duplicate email returns 409', async ({ page }) => {
  await signup(page)
  const r1 = await apiPost(page, '/contacts', { email: 'dup@example.com', name: 'A' })
  expect(r1.status).toBe(201)
  const r2 = await apiPost(page, '/contacts', { email: 'dup@example.com', name: 'B' })
  expect(r2.status).toBe(409)
})

test('DELETE /contacts/:id removes it', async ({ page }) => {
  await signup(page)
  const created = await apiPost<ContactRow>(page, '/contacts', {
    email: 'delme@example.com',
    name: 'Bye',
    tags: [],
  })
  expect(created.status).toBe(201)
  const id = created.body!.id
  const delResp = await page.request.delete(
    'http://localhost:' + (process.env.API_PORT || '4000') + '/api/contacts/' + id,
    {
      headers: {
        Authorization:
          'Bearer ' + (await page.context().cookies()).find((c) => c.name === 'token')?.value,
      },
    },
  )
  expect(delResp.status()).toBe(204)
  const after = await apiGet(page, `/contacts/${id}`)
  expect(after.status).toBe(404)
})
