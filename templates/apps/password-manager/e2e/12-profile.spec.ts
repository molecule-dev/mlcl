import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup, authedApiGet } from './_helpers'

test.describe('/profile', () => {
  test('renders user identity (name + email) from auth', async ({ page }) => {
    const { email } = await signup(page)
    await page.goto(APP_BASE + '/profile')
    await expect(page.getByTestId('profile-display-name')).toBeVisible()
    await expect(page.getByTestId('profile-email')).toContainText(email)
  })

  test('GET /api/recovery-keys fires on mount', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/profile')
      await page.waitForLoadState('networkidle')
    })
    const get = reqs.find((r) => r.method === 'GET' && /\/api\/recovery-keys(\?|$)/.test(r.url))
    expect(get, 'GET /api/recovery-keys must fire').toBeDefined()
    expect(get!.status).toBeLessThan(400)
  })

  test('Generate recovery kit POSTs and shows the recovery code', async ({ page, request }) => {
    await signup(page)
    await page.goto(APP_BASE + '/profile')
    await page.waitForLoadState('networkidle')
    const reqs = await captureNetwork(page, async () => {
      await page.getByTestId('profile-generate-recovery').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/recovery-keys(\?|$)/.test(r.url))
    expect(post, 'POST /api/recovery-keys must fire on generate').toBeDefined()
    expect(post!.status).toBeLessThan(300)
    await expect(page.getByTestId('profile-recovery-code')).toBeVisible()

    const { status, data } = await authedApiGet<unknown>(request, page, '/recovery-keys')
    expect(status).toBe(200)
    const list = (Array.isArray(data) ? data : ((data as { data?: unknown[] }).data ?? [])) as {
      id: string
    }[]
    expect(list.length, 'recovery keys list must contain at least one entry').toBeGreaterThan(0)
  })
})
