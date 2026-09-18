import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

/**
 * Kitchen-sink cross-page user journey. One signup, then walk every
 * primary feature surface in order. Asserts real outcomes (network
 * captures + DB readback) rather than just URL changes.
 */
test.describe('99 user journey', () => {
  test.setTimeout(120_000)

  test('signup → create room → add device → toggle device → activity logs → scene → automation → settings → /pricing → real Stripe checkout URL', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const api = await authedApi(request, session.accessToken!)

    await expect(page).toHaveURL(/\/overview/)
    await expect(page.getByRole('heading').first()).toBeVisible()

    const roomName = 'Journey room ' + Date.now()
    await page.goto(APP_BASE + '/rooms')
    await page.locator('[data-testid="rooms-new-button"]').click()
    await page.locator('#room-name').fill(roomName)
    const roomReqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="rooms-new-submit"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    expect(whereUrl(roomReqs, /\/api\/rooms(?:\?|$|\/)/, 'POST').length).toBeGreaterThan(0)
    await expect(page.getByText(roomName, { exact: false }).first()).toBeVisible()

    const deviceName = 'Journey lamp ' + Date.now()
    await page.goto(APP_BASE + '/devices/add')
    await page.locator('#device-name').fill(deviceName)
    await page.locator('#device-room').fill(roomName)
    await page.locator('#device-manufacturer').fill('Acme')
    await page.locator('[data-testid="add-device-submit"]').click()
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const devList = await (await api.get('/iot-devices')).json()
    const devArr = Array.isArray(devList) ? devList : devList.items || []
    const device = devArr.find((d: { name: string }) => d.name === deviceName)
    expect(device, 'device persists in DB').toBeTruthy()

    const beforeToggle = device
    const toggleRes = await api.post(`/iot-devices/${device.id}/toggle`, {})
    expect(toggleRes.status()).toBeLessThan(400)
    const afterToggle = await (await api.get(`/iot-devices/${device.id}`)).json()
    expect(afterToggle.is_on).toBe(!beforeToggle.is_on)

    await page.goto(APP_BASE + '/activity')
    await expect(page.getByRole('heading').first()).toBeVisible()

    const sceneName = 'Journey movie ' + Date.now()
    const sceneRes = await api.post('/scenes', {
      name: sceneName,
      description: '',
      icon: 'movie',
      device_states: [],
    })
    expect(sceneRes.status()).toBe(201)
    const scene = await sceneRes.json()
    const beforeAct = await (await api.get(`/scenes/${scene.id}`)).json()
    const startCount = Number(beforeAct.activation_count || 0)
    const actRes = await api.post(`/scenes/${scene.id}/activate`, {})
    expect(actRes.status()).toBeLessThan(400)
    const afterAct = await (await api.get(`/scenes/${scene.id}`)).json()
    expect(Number(afterAct.activation_count)).toBe(startCount + 1)

    const autoName = 'Journey routine ' + Date.now()
    const autoRes = await api.post('/automations', {
      name: autoName,
      description: '',
      enabled: true,
      trigger: { type: 'time', value: 'sunset' },
      actions: [{ type: 'notify', target: 'me' }],
    })
    expect(autoRes.status()).toBe(201)
    const auto = await autoRes.json()
    const beforeTrig = await (await api.get(`/automations/${auto.id}`)).json()
    const startExec = Number(beforeTrig.execution_count || 0)
    const trigRes = await api.post(`/automations/${auto.id}/trigger`, {})
    expect(trigRes.status()).toBeLessThan(400)
    const afterTrig = await (await api.get(`/automations/${auto.id}`)).json()
    expect(Number(afterTrig.execution_count)).toBe(startExec + 1)

    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    await expect(page.getByTestId('settings-plan-name').first()).toContainText(/free|…/i)

    const tiersRes = await api.get('/billing/tiers')
    const tiersBody = await tiersRes.json()
    const tiers = (tiersBody.data ?? tiersBody.tiers ?? tiersBody) as Array<{
      key: string
      prices: Array<{ period: string; stripePriceId: string | null }>
    }>
    const pro = tiers.find((t) => t.key === 'pro')
    const priceId = pro?.prices.find((p) => p.period === 'month')?.stripePriceId
    expect(priceId, 'pro priceId is wired').toBeTruthy()
    const checkoutRes = await api.post('/billing/checkout', { priceId })
    expect(checkoutRes.status()).toBeLessThan(300)
    const checkoutBody = (await checkoutRes.json()) as {
      checkoutUrl?: string
      data?: { checkoutUrl?: string }
    }
    const url = checkoutBody.checkoutUrl ?? checkoutBody.data?.checkoutUrl
    expect(url, 'real Stripe Checkout URL').toMatch(/checkout\.stripe\.com|cs_test_/)
  })
})
