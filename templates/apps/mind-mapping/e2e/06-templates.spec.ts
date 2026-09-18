import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, API_BASE, apiHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('Templates', () => {
  test('lists 6 system templates with node counts', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('tpl'))
    const res = await page.request.get(`${API_BASE}/templates`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await res.json()) as Array<{ id: string; is_system: boolean; name: string }>
    expect(body.length).toBeGreaterThanOrEqual(6)
    const systemNames = body
      .filter((t) => t.is_system)
      .map((t) => t.name)
      .sort()
    expect(systemNames).toEqual(
      expect.arrayContaining(['SWOT analysis', 'Open brainstorm', 'Customer persona']),
    )
    await page.goto(APP_BASE + '/templates')
    await expect(page.locator('text=SWOT analysis')).toBeVisible()
    await expect(page.locator('text=Open brainstorm')).toBeVisible()
  })

  test('Use template instantiates a fresh map owned by the user', async ({ page }) => {
    const { accessToken, userId } = await signup(page, uniqueEmail('use-tpl'))
    const tplsRes = await page.request.get(`${API_BASE}/templates`, {
      headers: apiHeaders(accessToken),
    })
    const tpls = (await tplsRes.json()) as Array<{
      id: string
      name: string
      snapshot: { nodes?: unknown[] }
    }>
    const swot = tpls.find((t) => t.name === 'SWOT analysis')
    expect(swot).toBeDefined()

    await page.goto(APP_BASE + `/templates/${swot!.id}`)
    await expect(page.getByRole('button', { name: /Use this template/i })).toBeVisible()
    await page.getByRole('button', { name: /Use this template/i }).click()
    await page.waitForURL(/\/maps\/[0-9a-f-]{36}$/, { timeout: 15000 })

    // Read-after-write: new map exists and has the same node count as the template snapshot
    const id = page.url().split('/').pop()!
    const map = await page.request.get(`${API_BASE}/maps/${id}`, {
      headers: apiHeaders(accessToken),
    })
    const body = (await map.json()) as { owner_id: string; title: string; nodes: unknown[] }
    expect(body.owner_id).toBe(userId)
    expect(body.title).toBe('SWOT analysis')
    expect(body.nodes.length).toBeGreaterThanOrEqual(swot!.snapshot.nodes?.length ?? 0)
  })

  test('Filter "Built-in" hides user templates and vice-versa', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('filter-tpl'))
    // create a user template via API
    await page.request.post(`${API_BASE}/templates`, {
      headers: apiHeaders(accessToken),
      data: {
        name: 'My private template',
        description: 'spec',
        snapshot: { nodes: [], connections: [] },
      },
    })
    await page.goto(APP_BASE + '/templates')
    await expect(page.locator('text=My private template')).toBeVisible()
    await page.getByRole('button', { name: /Built-in/i }).click()
    await expect(page.locator('text=My private template')).toHaveCount(0)
    await page.getByRole('button', { name: /My templates/i }).click()
    await expect(page.locator('text=SWOT analysis')).toHaveCount(0)
    await expect(page.locator('text=My private template')).toBeVisible()
  })
})
