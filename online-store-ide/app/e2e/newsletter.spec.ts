import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, uniqueEmail } from './_helpers.js'

test.describe('newsletter API', () => {
  test('POST /api/newsletter accepts a unique email', async ({ request }) => {
    const email = uniqueEmail('newsletter')
    const r = await request.post(API_BASE + '/newsletter', {
      data: { email },
    })
    expect([200, 201].includes(r.status())).toBeTruthy()
  })

  test('POST /api/newsletter rejects duplicate emails (or returns idempotent)', async ({
    request,
  }) => {
    const email = uniqueEmail('newsletter')
    const first = await request.post(API_BASE + '/newsletter', { data: { email } })
    expect([200, 201].includes(first.status())).toBeTruthy()
    const second = await request.post(API_BASE + '/newsletter', { data: { email } })
    expect([200, 201, 409, 400].includes(second.status())).toBeTruthy()
  })
})
