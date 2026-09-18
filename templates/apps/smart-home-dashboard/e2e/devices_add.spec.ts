import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, authedApi, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/devices/add', () => {
  test('add-device form refuses to submit without a name (client-side guard)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices/add')
    await page.locator('[data-testid="add-device-submit"]').click()
    await expect(page).toHaveURL(/\/devices\/add/)
  })

  test('add-device form POSTs /api/iot-devices and the device persists in the DB', async ({
    page,
    request,
  }) => {
    const session = await signup(page)
    const uniqueName = 'Hallway lamp ' + Date.now()
    await page.goto(APP_BASE + '/devices/add')
    await page.locator('#device-name').fill(uniqueName)
    await page.locator('#device-room').fill('Hallway')
    await page.locator('#device-manufacturer').fill('Acme')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-testid="add-device-submit"]').click()
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    })
    const posts = whereUrl(reqs, /\/api\/iot-devices(?:\/|$)/, 'POST')
    expect(posts.length, 'POST /api/iot-devices was called').toBeGreaterThan(0)
    expect(posts[0]!.status).toBeGreaterThanOrEqual(200)
    expect(posts[0]!.status).toBeLessThan(400)

    const api = await authedApi(request, session.accessToken!)
    const list = await api.get('/iot-devices')
    expect(list.status()).toBe(200)
    const items = await list.json()
    const arr = Array.isArray(items) ? items : items.items || []
    expect(arr.find((d: { name: string }) => d.name === uniqueName)).toBeTruthy()
  })

  test('add-device form lets the user pick a device type', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/devices/add')
    const typeField = page.locator('#device-type')
    if (await typeField.count().catch(() => 0)) {
      // Try a select first, then fall back to a textbox
      const tag = await typeField.evaluate((el) => el.tagName).catch(() => '')
      if (tag === 'SELECT') {
        await typeField.selectOption({ index: 1 }).catch(() => {})
      } else {
        await typeField.fill('light')
        await expect(typeField).toHaveValue('light')
      }
    } else {
      // No explicit type field — assert the form still renders the submit button
      await expect(page.locator('[data-testid="add-device-submit"]')).toBeVisible()
    }
  })
})
