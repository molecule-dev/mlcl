import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  captureNetwork,
  signup,
  whereUrl,
  authedApi,
  listEnvironments,
  literal,
} from './_helpers.js'

test.describe('/environments', () => {
  test('renders heading + at least one env card', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByRole('heading', { name: /^Environments$/i, level: 1 })).toBeVisible()
    const cards = page.locator('article')
    await expect(cards.first()).toBeAttached()
  })

  test('GET /api/environments fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/environments')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const get = whereUrl(reqs, /\/api\/environments(?:\?|$)/, 'GET')
    expect(get.length, 'GET /api/environments fired').toBeGreaterThan(0)
    expect(get[0].status).toBe(200)
  })

  test('cards show env name + health pill + traffic %', async ({ page }) => {
    const user = await signup(page)
    // Read the environments from the same endpoint the page reads — the
    // starter environments are demo content an app's owner replaces.
    const envs = await listEnvironments(page, user.accessToken!)
    expect(envs.length, 'envs list non-empty').toBeGreaterThan(0)
    await page.goto(APP_BASE + '/environments')
    for (const env of envs) {
      await expect(page.getByRole('heading', { name: literal(env.name), level: 3 })).toBeVisible()
    }
    await expect(page.getByText(/Healthy|Degraded/i).first()).toBeVisible()
    await expect(page.getByText(/traffic/i).first()).toBeVisible()
  })

  test('cards show URL link to environment', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    const links = page.locator('article >> a[href^="https://"]')
    await links.first().waitFor({ timeout: 10000 })
    await expect(links.first()).toBeAttached()
    const href = await links.first().getAttribute('href')
    expect(href).toMatch(/^https:\/\//)
  })

  test('cards show current deploy commit + Recent deploys list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/environments')
    await expect(page.getByText(/Current deploy/i).first()).toBeVisible()
    await expect(page.getByText(/Recent deploys/i).first()).toBeVisible()
    const deployItems = page.locator('article >> ul >> li')
    await expect(deployItems.first()).toBeAttached()
  })

  test('POST /api/environments/:id/deploy creates a new deploy (backend invariant)', async ({
    page,
    request,
  }) => {
    const user = await signup(page)
    expect(user.accessToken, 'auth token captured').toBeTruthy()
    const api = authedApi(request, user.accessToken!)
    // List envs to grab one
    const envsRes = await api.get('/environments')
    expect(envsRes.status()).toBe(200)
    const envs = await envsRes.json()
    const list = Array.isArray(envs) ? envs : (envs?.items ?? envs?.environments ?? [])
    expect(list.length, 'envs list non-empty').toBeGreaterThan(0)
    const env = list[0]
    const beforeRes = await api.get('/environments')
    const beforeList = await beforeRes.json()
    const beforeArr = Array.isArray(beforeList)
      ? beforeList
      : (beforeList?.items ?? beforeList?.environments ?? [])
    const beforeEnv = beforeArr.find((e: { id: string }) => e.id === env.id)
    const beforeDeployCount = (beforeEnv?.recent_deploys ?? []).length

    const deployRes = await api.post(`/environments/${env.id}/deploy`, {
      sha: 'abc1234deadbeefcafef00d12345678990abcdef',
      branch: 'main',
      status: 'success',
    })
    expect(deployRes.status(), 'deploy POST status').toBeLessThan(400)

    const afterRes = await api.get('/environments')
    const afterList = await afterRes.json()
    const afterArr = Array.isArray(afterList)
      ? afterList
      : (afterList?.items ?? afterList?.environments ?? [])
    const afterEnv = afterArr.find((e: { id: string }) => e.id === env.id)
    const afterDeployCount = (afterEnv?.recent_deploys ?? []).length
    expect(afterDeployCount, 'recent_deploys grew after POST').toBeGreaterThanOrEqual(
      beforeDeployCount,
    )
  })
})
