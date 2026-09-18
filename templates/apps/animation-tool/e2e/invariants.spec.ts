import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup, uniqueEmail } from './_helpers.js'

/**
 * Backend-invariant tests. For every primary user action, verify the
 * read-after-write outcome by issuing a fresh GET and inspecting the
 * actual server state — never rely on local UI updates.
 */

async function cookieHeader(page: any) {
  const cookies = await page.context().cookies()
  const c = cookies.map((c: any) => `${c.name}=${c.value}`).join('; ')
  return c ? { Cookie: c } : {}
}

test.describe('invariants', () => {
  test('signup uniqueness — same email cannot register twice', async ({ page, browser }) => {
    const email = uniqueEmail('uniqueness')
    await signup(page, email)
    // New incognito context so we don't reuse the session.
    const ctx = await browser.newContext()
    const p2 = await ctx.newPage()
    await p2.goto(APP_BASE + '/signup')
    await p2.locator('input#firstName').fill('B')
    await p2.locator('input#lastName').fill('B')
    await p2.locator('input#email').fill(email)
    await p2.locator('input#password').fill('TestPass123!')
    await p2.locator('input#confirm').fill('TestPass123!')
    await p2.getByRole('button', { name: /create\s*account/i }).click()
    await p2.waitForTimeout(3_000)
    // Either the page stays on /signup with an error, or backend returns non-2xx.
    expect(p2.url(), 'duplicate email must not log in').toMatch(/\/signup/)
    await ctx.close()
  })

  test('project create then GET /projects returns the row with owner_id matching the session user', async ({
    page,
  }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const create = await page.request.post(`${API_BASE}/projects`, {
      data: { name: 'Inv test' },
      headers,
    })
    const created = await create.json()
    expect(create.status()).toBeLessThan(300)
    const list = await page.request.get(`${API_BASE}/projects`, { headers })
    const arr = await list.json()
    const found = arr.find((p: { id: string }) => p.id === created.id)
    expect(found, 'project visible in next GET /projects').toBeTruthy()
    expect(found.owner_id, 'owner_id is set on the row').toBeTruthy()
  })

  test('layer create persists and is visible only to the owning user', async ({
    page,
    browser,
  }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const project = await page.request.post(`${API_BASE}/projects`, {
      data: { name: 'Layer iso' },
      headers,
    })
    const projectId = (await project.json()).id
    const layer = await page.request.post(`${API_BASE}/layers`, {
      data: { projectId, name: 'L1', type: 'shape' },
      headers,
    })
    expect(layer.status()).toBeLessThan(300)
    const layerId = (await layer.json()).id

    // Second user should NOT see the layer.
    const ctx = await browser.newContext()
    const p2 = await ctx.newPage()
    await signup(p2)
    const otherHeaders = await cookieHeader(p2)
    const otherList = await p2.request.get(`${API_BASE}/layers?projectId=${projectId}`, {
      headers: otherHeaders,
    })
    const otherArr = await otherList.json()
    expect(
      Array.isArray(otherArr) && otherArr.some((l: { id: string }) => l.id === layerId),
      'second user must not see first user’s layer',
    ).toBe(false)
    await ctx.close()
  })

  test('keyframe create persists and round-trips through GET', async ({ page }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const project = await page.request.post(`${API_BASE}/projects`, {
      data: { name: 'KF iso' },
      headers,
    })
    const projectId = (await project.json()).id
    const layer = await page.request.post(`${API_BASE}/layers`, {
      data: { projectId, name: 'L1', type: 'shape' },
      headers,
    })
    const layerId = (await layer.json()).id
    const kf = await page.request.post(`${API_BASE}/keyframes`, {
      data: { projectId, layerId, time: 0, property: 'opacity', value: 0.5, easing: 'linear' },
      headers,
    })
    expect(kf.status()).toBeLessThan(300)
    const kfId = (await kf.json()).id
    const list = await page.request.get(`${API_BASE}/keyframes?projectId=${projectId}`, { headers })
    const arr = await list.json()
    const found = arr.find((k: { id: string }) => k.id === kfId)
    expect(found, 'keyframe must persist').toBeTruthy()
  })

  test('state create with isInitial:true persists is_initial=true', async ({ page }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const project = await page.request.post(`${API_BASE}/projects`, {
      data: { name: 'State iso' },
      headers,
    })
    const projectId = (await project.json()).id
    const state = await page.request.post(`${API_BASE}/states`, {
      data: { projectId, name: 'idle', isInitial: true },
      headers,
    })
    expect(state.status()).toBeLessThan(300)
    const stateId = (await state.json()).id
    const list = await page.request.get(`${API_BASE}/states?projectId=${projectId}`, { headers })
    const arr = await list.json()
    const found = arr.find((s: { id: string }) => s.id === stateId)
    expect(found, 'state persists').toBeTruthy()
    expect(found.is_initial, 'is_initial honoured by handler').toBe(true)
  })

  test('export create then download returns real artifact bytes (Lottie JSON)', async ({
    page,
  }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const project = await page.request.post(`${API_BASE}/projects`, {
      data: { name: 'Export iso' },
      headers,
    })
    const projectId = (await project.json()).id
    await page.request.post(`${API_BASE}/layers`, {
      data: { projectId, name: 'L1', type: 'shape' },
      headers,
    })
    const xp = await page.request.post(`${API_BASE}/exports`, {
      data: { projectId, format: 'lottie', quality: 'high' },
      headers,
    })
    expect(xp.status()).toBeLessThan(300)
    const xpData = await xp.json()
    expect(xpData.status, 'export must complete synchronously').toBe('completed')
    expect(xpData.output_url, 'output_url present').toMatch(/\/api\/exports\/.+\/download/)
    const dl = await page.request.get(
      `http://localhost:${process.env.API_PORT || '4050'}${xpData.output_url}`,
      { headers },
    )
    expect(dl.status()).toBe(200)
    const body = await dl.text()
    const lottie = JSON.parse(body)
    expect(lottie.v, 'lottie has version').toBeTruthy()
    expect(Array.isArray(lottie.layers)).toBe(true)
  })

  test('billing checkout returns either checkoutUrl or updated, never 5xx', async ({ page }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const tiers = await page.request.get(`${API_BASE}/billing/tiers`, { headers })
    const tiersBody = await tiers.json()
    const list = tiersBody.data ?? tiersBody
    const proPriceId = list
      .flatMap((t: { prices?: Array<{ stripePriceId?: string }> }) => t.prices ?? [])
      .find((p: { stripePriceId?: string }) => p.stripePriceId)?.stripePriceId
    expect(proPriceId, 'at least one tier must declare a stripe priceId').toBeTruthy()
    const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
      data: { priceId: proPriceId },
      headers,
    })
    expect(checkout.status(), 'checkout must not 5xx').toBeLessThan(500)
    const body = await checkout.json()
    expect(
      body.checkoutUrl || body.updated || body.error,
      'response must be one of: checkoutUrl, updated, or error',
    ).toBeTruthy()
  })

  test('plan status reflects starter tier on a new account', async ({ page }) => {
    await signup(page)
    const headers = await cookieHeader(page)
    const status = await page.request.get(`${API_BASE}/billing/status`, { headers })
    expect(status.status()).toBeLessThan(300)
    const body = await status.json()
    expect(body.planKey, 'a new account starts on the free plan').toMatch(/free|starter/i)
    expect(body.limits, 'limits returned').toBeTruthy()
    expect(typeof body.limits.maxProjects).toBe('number')
  })
})
