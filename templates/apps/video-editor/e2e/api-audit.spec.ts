import { expect, test } from '@molecule/app-e2e-fixtures-default'
import { getAccessToken, rawRequest, signup, uniqueEmail } from './_helpers.js'

test.describe('api audit (auth + crud)', () => {
  test('all primary CRUD endpoints return 2xx for owner', async ({ page, request }) => {
    await signup(page)
    const token = (await getAccessToken(page)) ?? ''
    expect(token, 'token present').toBeTruthy()
    const checks: Array<[string, string, string, unknown?]> = [
      ['GET', '/projects', '200'],
      ['GET', '/exports', '200'],
      ['GET', '/assets', '200'],
      ['GET', '/templates', '200'],
      ['GET', '/billing/status', '200'],
      ['GET', '/billing/tiers', '200'],
    ]
    for (const [method, path] of checks) {
      const res = await rawRequest(request, method as 'GET', path, token)
      expect(res.status, `${method} ${path}`).toBeLessThan(400)
    }
  })

  test("foreign user cannot read other user's project", async ({ page, request }) => {
    // Create user A + project
    await signup(page, uniqueEmail('owner'))
    const tokenA = (await getAccessToken(page)) ?? ''
    const created = await rawRequest<{ id?: string }>(request, 'POST', '/projects', tokenA, {
      name: 'Private Project',
    })
    expect(created.status).toBeLessThan(400)
    const projectId = (created.body as { id?: string })?.id
    expect(projectId).toBeTruthy()

    // Sign up user B in a fresh context + try to read
    const ctxB = await page.context().browser()!.newContext()
    const pageB = await ctxB.newPage()
    await signup(pageB, uniqueEmail('intruder'))
    const tokenB = (await getAccessToken(pageB)) ?? ''
    await ctxB.close()
    expect(tokenB).not.toBe(tokenA)
    const peek = await rawRequest(request, 'GET', `/projects/${projectId}`, tokenB)
    expect(peek.status, 'foreign read should 404').toBe(404)
  })

  test('unauthenticated access to /api/projects returns 401', async ({ request }) => {
    const res = await rawRequest(request, 'GET', '/projects')
    expect(res.status).toBe(401)
  })
})
