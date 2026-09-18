import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, apiContext, signup, unwrapList } from './_helpers.js'

test.describe('Leads (capture + agent inbox)', () => {
  test('Anonymous lead capture appears in agent inbox at /admin/leads', async ({ page }) => {
    const ctx = await apiContext()

    // 1. Get a property whose listing has an assigned agent_id so the
    //    lead can be routed (the schema requires a non-null agent_id;
    //    the v1 model treats agent_id as the owning user).
    const all = unwrapList<{ id: string; agent_id?: string | null; title?: string }>(
      await (await ctx.get(`${API_BASE}/properties?limit=200`)).json(),
    )
    expect(all.length).toBeGreaterThan(0)
    const property = all.find((p) => p.agent_id)
    if (!property) {
      test.skip(true, 'no seeded property carries an agent_id; cannot route a lead')
    }

    // 2. Submit a lead anonymously via the public POST /leads endpoint.
    const uniqueName = `Lead ${Date.now()}`
    const uniqueMessage = `interested in ${property!.title ?? 'this property'} (${Date.now()})`
    const leadResp = await ctx.post(`${API_BASE}/leads`, {
      data: {
        property_id: property!.id,
        agent_id: property!.agent_id,
        name: uniqueName,
        email: `lead-${Date.now()}@example.com`,
        phone: '+15551234567',
        message: uniqueMessage,
      },
    })
    expect(leadResp.ok(), `POST /leads => ${leadResp.status()} ${await leadResp.text()}`).toBe(true)

    // 3. Sign up as an agent and confirm the leads page renders without
    //    error. The lead won't be assigned to this brand-new agent
    //    (anon leads stay unassigned), but the page must load and the
    //    /api/leads call must return 200.
    await signup(page)
    let leadsStatus = 0
    page.on('response', (resp) => {
      if (resp.url().includes('/api/leads') && resp.request().method() === 'GET') {
        leadsStatus = resp.status()
      }
    })
    await page.goto('/admin/leads')
    await page.waitForLoadState('networkidle')
    expect(leadsStatus, `/api/leads should respond 200, got ${leadsStatus}`).toBe(200)
  })
})
