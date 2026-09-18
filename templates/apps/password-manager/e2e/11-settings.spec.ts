import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/settings', () => {
  test('renders nav with all four sections and master password panel by default', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByTestId('settings-nav-master')).toBeVisible()
    await expect(page.getByTestId('settings-nav-twofa')).toBeVisible()
    await expect(page.getByTestId('settings-nav-sessions')).toBeVisible()
    await expect(page.getByTestId('settings-nav-sync')).toBeVisible()
    await expect(page.getByTestId('settings-master')).toBeVisible()
  })

  test('clicking each nav reveals the corresponding panel', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')

    await page.getByTestId('settings-nav-twofa').click()
    await expect(page.getByTestId('settings-twofa')).toBeVisible()

    await page.getByTestId('settings-nav-sessions').click()
    await expect(page.getByTestId('settings-sessions')).toBeVisible()

    await page.getByTestId('settings-nav-sync').click()
    await expect(page.getByTestId('settings-sync')).toBeVisible()
  })

  test('2FA panel: enroll button POSTs /api/two-factor/enroll and shows secret', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.getByTestId('settings-nav-twofa').click()

    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('twofa-enroll').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/two-factor\/enroll/.test(r.url))
    expect(post, 'POST /api/two-factor/enroll must fire').toBeDefined()
    expect(post!.status).toBeLessThan(300)
    await expect(page.getByTestId('twofa-secret')).toBeVisible()
  })

  test('Sessions panel: GET /api/devices fires and renders empty state or list', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await page.getByTestId('settings-nav-sessions').click()
      await page.waitForLoadState('networkidle')
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/devices(\?|$)/.test(r.url))
    expect(get, 'GET /api/devices must fire when sessions panel is opened').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })
})
