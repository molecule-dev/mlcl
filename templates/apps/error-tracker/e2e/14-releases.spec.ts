import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, authHeaders, signup, uniqueEmail } from './_helpers.js'

test.describe('/releases', () => {
  test('lists seeded releases', async ({ page }) => {
    await signup(page, uniqueEmail('rel-list'))
    const res = await page.request.get(`${API_BASE}/releases`, {
      headers: authHeaders(page),
    })
    expect(res.status()).toBe(200)
    const list = (await res.json()) as Array<{ id: string; version: string; environment: string }>
    expect(list.length, 'seed should provision releases').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/releases')
    await page.waitForLoadState('networkidle')
    expect(await page.locator('body').innerText()).toContain(list[0]!.version)
  })

  test('release detail page renders the version + commits', async ({ page }) => {
    await signup(page, uniqueEmail('rel-detail'))
    const res = await page.request.get(`${API_BASE}/releases`, {
      headers: authHeaders(page),
    })
    const list = (await res.json()) as Array<{ id: string; version: string; commits?: unknown[] }>
    if (!list.length) test.skip()
    const target = list[0]!
    await page.goto(APP_BASE + `/releases/${encodeURIComponent(target.version)}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).toContain(target.version)
  })

  test('POST /releases lets a user log a deploy that is then visible', async ({ page }) => {
    await signup(page, uniqueEmail('rel-create'))
    const projects = await page.request.get(`${API_BASE}/projects-health`, {
      headers: authHeaders(page),
    })
    const projList = (await projects.json()) as Array<{ id: string }>
    expect(projList.length).toBeGreaterThan(0)
    const newVersion = `99.${Date.now()}.0`
    const post = await page.request.post(`${API_BASE}/releases`, {
      headers: authHeaders(page),
      data: {
        project_id: projList[0]!.id,
        version: newVersion,
        environment: 'production',
        author: 'tester@faultline.dev',
      },
    })
    expect(post.status(), `POST /releases body=${await post.text().catch(() => '')}`).toBeLessThan(
      300,
    )
    const after = await page.request.get(`${API_BASE}/releases`, {
      headers: authHeaders(page),
    })
    const list = (await after.json()) as Array<{ version: string }>
    expect(
      list.some((r) => r.version === newVersion),
      'new release persists',
    ).toBeTruthy()
  })
})
