/**
 * Labels contract — CRUD + email tagging round-trip.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiHeaders, listEmails, signup } from './_helpers.js'

test('POST /labels creates a custom label visible in GET /labels', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/labels`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Important', color: '#ef4444' },
  })
  expect(create.status(), await create.text()).toBe(201)
  const label = (await create.json()) as { id: string; name: string; color: string }
  expect(label.id).toBeTruthy()
  expect(label.name).toBe('Important')

  const list = await page.request.get(`${API_BASE}/labels`, { headers: apiHeaders(accessToken) })
  expect(list.status()).toBe(200)
  const all = (await list.json()) as Array<{ id: string; name: string }>
  expect(all.find((l) => l.id === label.id)).toBeTruthy()
})

test('PUT /labels/:id renames a label', async ({ page }) => {
  const { accessToken } = await signup(page)
  const list = await page.request.get(`${API_BASE}/labels`, { headers: apiHeaders(accessToken) })
  const labels = (await list.json()) as Array<{ id: string; name: string }>
  const target = labels.find((l) => l.name === 'Work')
  expect(target).toBeTruthy()

  const upd = await page.request.put(`${API_BASE}/labels/${target!.id}`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Work-Renamed' },
  })
  expect(upd.status()).toBe(200)

  const after = await page.request.get(`${API_BASE}/labels`, { headers: apiHeaders(accessToken) })
  const refreshed = (await after.json()) as Array<{ id: string; name: string }>
  expect(refreshed.find((l) => l.id === target!.id)?.name).toBe('Work-Renamed')
})

test('POST /labels/:labelId/emails/:emailId attaches a label to an email', async ({ page }) => {
  const { accessToken } = await signup(page)
  const labelsRes = await page.request.get(`${API_BASE}/labels`, {
    headers: apiHeaders(accessToken),
  })
  const labels = (await labelsRes.json()) as Array<{ id: string; name: string }>
  const label = labels[0]!
  const inbox = await listEmails(page, accessToken, { folder: 'inbox' })
  const target = inbox[0]!

  const attach = await page.request.post(`${API_BASE}/labels/${label.id}/emails/${target.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 201, 204]).toContain(attach.status())

  // Detach again and verify both calls are accepted.
  const detach = await page.request.delete(`${API_BASE}/labels/${label.id}/emails/${target.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(detach.status())
})

test('DELETE /labels/:id removes the label', async ({ page }) => {
  const { accessToken } = await signup(page)
  const create = await page.request.post(`${API_BASE}/labels`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Throwaway', color: '#000000' },
  })
  const label = (await create.json()) as { id: string }

  const del = await page.request.delete(`${API_BASE}/labels/${label.id}`, {
    headers: apiHeaders(accessToken),
  })
  expect([200, 204]).toContain(del.status())

  const list = await page.request.get(`${API_BASE}/labels`, { headers: apiHeaders(accessToken) })
  const all = (await list.json()) as Array<{ id: string }>
  expect(all.find((l) => l.id === label.id)).toBeFalsy()
})
