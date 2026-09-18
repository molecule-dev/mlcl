import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { apiFetch, signup } from './_helpers'

// access_policies — paid-tier feature surfaced in /pricing limits
// (`maxAccessPolicies`). The handler exposes full CRUD; the UI surface
// today is the pricing copy and (future) Settings → Access policies tab.
// We exercise the API contract so the resource works end-to-end and the
// pricing promise isn't a write-only column.

test.describe('access policies (API)', () => {
  test('CRUD round-trips: create → list → update → delete', async ({ page }) => {
    await signup(page)

    // Create
    const created = await apiFetch(page, 'POST', '/access-policies', {
      name: 'ci-readers',
      path_pattern: '/ci/*',
      permissions: ['read'],
      allowed_environments: ['production'],
    })
    expect(created.status, JSON.stringify(created.json)).toBe(201)
    const policyId = (created.json as { id: string }).id

    // List
    const list = await apiFetch(page, 'GET', '/access-policies')
    expect(list.status).toBe(200)
    const policies = list.json as Array<{ id: string; name: string }>
    expect(policies.some((p) => p.id === policyId && p.name === 'ci-readers')).toBe(true)

    // Get-one
    const getOne = await apiFetch(page, 'GET', `/access-policies/${policyId}`)
    expect(getOne.status).toBe(200)
    expect((getOne.json as { name: string }).name).toBe('ci-readers')

    // Update
    const updated = await apiFetch(page, 'PUT', `/access-policies/${policyId}`, {
      name: 'ci-readers-renamed',
    })
    expect(updated.status).toBe(200)
    const after = await apiFetch(page, 'GET', `/access-policies/${policyId}`)
    expect((after.json as { name: string }).name).toBe('ci-readers-renamed')

    // Delete
    const del = await apiFetch(page, 'DELETE', `/access-policies/${policyId}`)
    expect(del.status).toBeLessThan(300)
    const gone = await apiFetch(page, 'GET', `/access-policies/${policyId}`)
    expect(gone.status).toBe(404)
  })

  test('rejects unauthenticated access', async ({ page }) => {
    const baseURL =
      process.env.API_BASE || 'http://localhost:' + (process.env.API_PORT || '4270') + '/api'
    const resp = await page.request.get(baseURL + '/access-policies')
    expect(resp.status()).toBe(401)
  })
})
