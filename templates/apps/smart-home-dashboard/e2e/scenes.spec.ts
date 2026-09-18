import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, seedScene, signup, whereUrl } from './_helpers.js'

test.describe('Scenes', () => {
  test('scenes page renders for a fresh user (no scenes yet)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/scenes')
    await expect(page.getByRole('heading', { name: /scenes/i }).first()).toBeVisible()
    await expect(page.locator('[data-testid="scenes-empty"]')).toBeVisible()
  })

  test('seeded scenes appear on /scenes', async ({ page, request }) => {
    const session = await signup(page)
    const scene = await seedScene(request, session.accessToken!, {
      name: 'My movie night',
    })
    await page.goto(APP_BASE + '/scenes')
    await expect(page.getByText(scene.name, { exact: false })).toBeVisible()
  })

  test('new-scene form POSTs /api/scenes and the scene appears immediately', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const uniqueName = 'Date night ' + Date.now()
    await page.goto(APP_BASE + '/scenes')
    await page.locator('[data-testid="scenes-new-button"]').click()
    await page.locator('#scene-name').fill(uniqueName)
    await page.locator('#scene-description').fill('Lights low, music on')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="scenes-new-submit"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(reqs, /\/api\/scenes(?:\/|\?|$)/, 'POST').length).toBeGreaterThan(0)

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/scenes')
    expect(list.status()).toBe(200)
    const items = await list.json()
    const arr = Array.isArray(items) ? items : items.items || []
    expect(arr.find((s: { name: string }) => s.name === uniqueName)).toBeTruthy()

    // UI also renders the new scene without a refresh
    await expect(page.getByText(uniqueName, { exact: false })).toBeVisible()
  })

  test('activating a seeded scene increments activation_count', async ({ page, request }) => {
    const session = await signup(page)
    const scene = await seedScene(request, session.accessToken!, {
      name: 'Activate me',
    })
    const api = await authedApi(request, session.accessToken!)
    const before = await (await api.get(`/scenes/${scene.id}`)).json()
    const startCount = Number(before.activation_count || 0)
    const res = await api.post(`/scenes/${scene.id}/activate`, {})
    expect(res.status()).toBeLessThan(400)
    const after = await (await api.get(`/scenes/${scene.id}`)).json()
    expect(Number(after.activation_count)).toBe(startCount + 1)
    expect(after.last_activated).toBeTruthy()
    // sanity: visit the page and ensure list still renders
    await page.goto(APP_BASE + '/scenes')
    await expect(page.getByText(scene.name, { exact: false })).toBeVisible()
  })
})
