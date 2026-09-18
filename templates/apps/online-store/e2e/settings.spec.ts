import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('settings page renders for signed-in user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/settings/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('updating profile via PATCH /api/users/me persists across reload', async ({
    page,
    request,
  }) => {
    await signup(page)
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
    const newName = 'Updated Shopper ' + Date.now()
    const r = await request.patch(API_BASE + '/users/me', {
      headers: { Cookie: cookieHeader, 'Content-Type': 'application/json' },
      data: { name: newName },
    })
    expect(r.ok()).toBeTruthy()
    const me = await request.get(API_BASE + '/users/me', { headers: { Cookie: cookieHeader } })
    const body = (await me.json()) as {
      name?: string
      data?: { name?: string }
      props?: { name?: string }
    }
    const name = body.props?.name ?? body.data?.name ?? body.name
    expect(name).toBe(newName)
  })
})
